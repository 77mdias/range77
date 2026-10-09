import type { CoachInsight, ContextualRating } from '@/contracts/coach';
import type { MatchCombatStats } from '@/contracts/henrikdev';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: analytics de combate.
 * ======================================================================
 *
 * Funções PURAS e determinísticas: entrada `MatchCombatStats[]`, saída
 * `CombatMetrics` (números exatos + classificação) e o envelope de 3
 * camadas `CoachInsight` pronto para o chatbot MiniMax.
 *
 * Regras de rigor estatístico do módulo:
 *   - Divisões por zero têm guarda explícita com convenção documentada
 *     (deaths=0 → KDR igual aos kills; NUNCA `Infinity` no JSON);
 *   - Métricas não computáveis a partir dos dados fornecidos são `null`
 *     no cálculo e CHAVE OMITIDA no envelope (nunca 0 enganoso);
 *   - A HenrikDev não fornece KAST: reportamos `null` em vez de inventar.
 */

/** Erro de cálculo/validação de combate — mensagens citam índice e campo. */
export class CombatMetricsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CombatMetricsError';
  }
}

/** Classificação de mira (base: HS% — benchmarks de comunidade/radiante). */
export type AimClass = 'Crítico' | 'Regular' | 'Excelente' | 'Indeterminado';

/** Classificação de impacto por rodada (base: ACS). */
export type ImpactClass = 'Passivo' | 'Equilibrado' | 'Carregador';

/** Somatórios da amostra (tamanho de amostra é contexto, não métrica). */
export interface CombatTotals {
  readonly matches: number;
  readonly rounds: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly headshots: number;
  readonly bodyshots: number;
  readonly legshots: number;
}

/**
 * Métricas agregadas de combate.
 * Campos `null` = não computável com os dados fornecidos (ver regra acima).
 */
export interface CombatMetrics {
  /** Kill/Death ratio. deaths=0 → igual a kills (convenção, nunca Infinity). */
  readonly kdr: number;
  /** Abates por round. */
  readonly kpr: number;
  /** Average Combat Score por round (inteiro, como no jogo). */
  readonly acs: number;
  /** KAST agregado ponderado por rounds (0–100). `null` se ninguém forneceu. */
  readonly kast: number | null;
  /** Headshot % sobre tiros conectados. `null` se não há dado de tiro. */
  readonly hsPercentage: number | null;
  /** First bloods somados. `null` se nenhum match forneceu o dado. */
  readonly firstBloods: number | null;
  /** First deaths somados. `null` se nenhum match forneceu o dado. */
  readonly firstDeaths: number | null;
  readonly totals: CombatTotals;
  readonly evaluation: {
    readonly aimClass: AimClass;
    readonly impactClass: ImpactClass;
  };
}

/**
 * Métricas numéricas expostas ao chatbot (camada 1 do CoachInsight).
 * Chaves opcionais = omitidas quando não computáveis.
 */
export type CombatRawMetrics = {
  readonly kdr: number;
  readonly kpr: number;
  readonly acs: number;
  readonly hsPercentage?: number;
  readonly kast?: number;
  readonly firstBloods?: number;
  readonly firstDeaths?: number;
  readonly matches: number;
  readonly rounds: number;
};

/**
 * Thresholds de classificação (3 classes) e gatilhos de coaching hooks.
 * Benchmarks de referência do Valorant (comunidade / elos altos) —
 * ajustáveis sem tocar na lógica de cálculo.
 */
export const COMBAT_THRESHOLDS = {
  /** HS% ≥ 25 → mira "Excelente". */
  hsExcelente: 25,
  /** HS% ≥ 18 → mira "Regular". */
  hsRegular: 18,
  /** ACS ≥ 230 → impacto "Carregador". */
  acsCarregador: 230,
  /** ACS ≥ 180 → impacto "Equilibrado". */
  acsEquilibrado: 180,
  /** KAST < 66 dispara hook de rodadas sem contribuição. */
  kastBaixo: 66,
  /** Abaixo disso a amostra ganha hook de baixa confiabilidade. */
  amostraMinima: 5,
} as const;

interface RatingBand {
  readonly min: number;
  readonly rating: ContextualRating;
}

/** Conjunto nominal de faixas — indexável sem fallback (tipagem fechada). */
interface CombatBenchmarkSet {
  readonly kdr: readonly RatingBand[];
  readonly kpr: readonly RatingBand[];
  readonly acs: readonly RatingBand[];
  readonly hsPercentage: readonly RatingBand[];
  readonly kast: readonly RatingBand[];
}

/**
 * Faixas de rating semântico (camada 2) por métrica — ordem descendente.
 * Base: percentis de elos altos do Valorant (Imortal/Radiante).
 */
export const COMBAT_BENCHMARKS: CombatBenchmarkSet = {
  kdr: [
    { min: 1.4, rating: 'Excelente' },
    { min: 1.15, rating: 'Acima da Média' },
    { min: 0.95, rating: 'Na Média' },
    { min: 0.75, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
  kpr: [
    { min: 0.85, rating: 'Excelente' },
    { min: 0.75, rating: 'Acima da Média' },
    { min: 0.65, rating: 'Na Média' },
    { min: 0.55, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
  acs: [
    { min: 250, rating: 'Excelente' },
    { min: 215, rating: 'Acima da Média' },
    { min: 175, rating: 'Na Média' },
    { min: 140, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
  hsPercentage: [
    { min: 28, rating: 'Excelente' },
    { min: 23, rating: 'Acima da Média' },
    { min: 18, rating: 'Na Média' },
    { min: 13, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
  kast: [
    { min: 78, rating: 'Excelente' },
    { min: 72, rating: 'Acima da Média' },
    { min: 66, rating: 'Na Média' },
    { min: 58, rating: 'Abaixo da Média' },
    { min: 0, rating: 'Crítico' },
  ],
};

/** Arredondamento determinístico (evita 20.000000000000004 no JSON). */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Valida uma partida: números finitos, não-negativos, rounds ≥ 1, KAST 0–100. */
function assertValidMatch(match: MatchCombatStats, index: number): void {
  const assertNonNegative = (value: number, field: string): void => {
    if (!Number.isFinite(value) || value < 0) {
      throw new CombatMetricsError(
        `Partida #${index} inválida: campo "${field}" com valor ${String(value)} (esperado número finito e não-negativo).`,
      );
    }
  };

  assertNonNegative(match.kills, 'kills');
  assertNonNegative(match.deaths, 'deaths');
  assertNonNegative(match.assists, 'assists');
  assertNonNegative(match.headshots, 'headshots');
  assertNonNegative(match.bodyshots, 'bodyshots');
  assertNonNegative(match.legshots, 'legshots');
  assertNonNegative(match.score, 'score');

  if (!Number.isFinite(match.roundsPlayed) || match.roundsPlayed < 1) {
    throw new CombatMetricsError(
      `Partida #${index} inválida: campo "roundsPlayed" com valor ${String(match.roundsPlayed)} (esperado >= 1).`,
    );
  }

  if (
    match.kast !== undefined &&
    (!Number.isFinite(match.kast) || match.kast < 0 || match.kast > 100)
  ) {
    throw new CombatMetricsError(
      `Partida #${index} inválida: campo "kast" com valor ${String(match.kast)} (esperado entre 0 e 100).`,
    );
  }

  if (match.firstBloods !== undefined) {
    assertNonNegative(match.firstBloods, 'firstBloods');
  }
  if (match.firstDeaths !== undefined) {
    assertNonNegative(match.firstDeaths, 'firstDeaths');
  }
  if (match.damageDealt !== undefined) {
    assertNonNegative(match.damageDealt, 'damageDealt');
  }
}

function classifyAim(hsPercentage: number | null): AimClass {
  if (hsPercentage === null) {
    return 'Indeterminado';
  }
  if (hsPercentage >= COMBAT_THRESHOLDS.hsExcelente) {
    return 'Excelente';
  }
  return hsPercentage >= COMBAT_THRESHOLDS.hsRegular ? 'Regular' : 'Crítico';
}

function classifyImpact(acs: number): ImpactClass {
  if (acs >= COMBAT_THRESHOLDS.acsCarregador) {
    return 'Carregador';
  }
  return acs >= COMBAT_THRESHOLDS.acsEquilibrado ? 'Equilibrado' : 'Passivo';
}

/** Primeira faixa cujo `min` ≤ valor; senão, o fallback (última faixa). */
export function rateMetric(
  value: number,
  bands: readonly RatingBand[],
  fallback: ContextualRating,
): ContextualRating {
  let rating = fallback;
  for (const band of bands) {
    if (value >= band.min) {
      rating = band.rating;
      break;
    }
  }
  return rating;
}

/**
 * Agrega as partidas em métricas de combate.
 *
 * @throws {CombatMetricsError} entrada não-array, amostra vazia ou qualquer
 * partida com campo inválido (a mensagem cita índice e campo exatos).
 */
export function calculateCombatMetrics(matches: readonly MatchCombatStats[]): CombatMetrics {
  if (!Array.isArray(matches)) {
    throw new CombatMetricsError(
      'Entrada inválida: esperado um array de partidas para calcular métricas de combate.',
    );
  }
  if (matches.length === 0) {
    throw new CombatMetricsError('Nenhuma partida fornecida para análise de combate.');
  }

  matches.forEach(assertValidMatch);

  const sums = matches.reduce(
    (acc, m) => {
      acc.rounds += m.roundsPlayed;
      acc.kills += m.kills;
      acc.deaths += m.deaths;
      acc.assists += m.assists;
      acc.headshots += m.headshots;
      acc.bodyshots += m.bodyshots;
      acc.legshots += m.legshots;
      acc.score += m.score;
      return acc;
    },
    { rounds: 0, kills: 0, deaths: 0, assists: 0, headshots: 0, bodyshots: 0, legshots: 0, score: 0 },
  );

  // KAST ponderado por rounds (partidas longas pesam mais que curtas).
  const kastAcc = matches.reduce(
    (acc, m) => {
      if (m.kast !== undefined) {
        acc.weightedSum += m.kast * m.roundsPlayed;
        acc.rounds += m.roundsPlayed;
      }
      return acc;
    },
    { weightedSum: 0, rounds: 0 },
  );

  // First bloods/deaths: somam-se apenas quando a fonte forneceu o dado.
  const hasEntryData = matches.some((m) => m.firstBloods !== undefined || m.firstDeaths !== undefined);
  const firstBloods = hasEntryData
    ? matches.reduce((sum, m) => sum + (m.firstBloods ?? 0), 0)
    : null;
  const firstDeaths = hasEntryData
    ? matches.reduce((sum, m) => sum + (m.firstDeaths ?? 0), 0)
    : null;

  const totalShots = sums.headshots + sums.bodyshots + sums.legshots;
  const hsPercentage = totalShots === 0 ? null : roundTo((sums.headshots / totalShots) * 100, 1);
  const kast = kastAcc.rounds === 0 ? null : roundTo(kastAcc.weightedSum / kastAcc.rounds, 1);

  // Guarda de divisão por zero: amostra sem mortes → KDR = kills (finito).
  const kdr = sums.deaths === 0 ? sums.kills : roundTo(sums.kills / sums.deaths, 2);
  const kpr = roundTo(sums.kills / sums.rounds, 2);
  const acs = Math.round(sums.score / sums.rounds);

  return {
    kdr,
    kpr,
    acs,
    kast,
    hsPercentage,
    firstBloods,
    firstDeaths,
    totals: {
      matches: matches.length,
      rounds: sums.rounds,
      kills: sums.kills,
      deaths: sums.deaths,
      assists: sums.assists,
      headshots: sums.headshots,
      bodyshots: sums.bodyshots,
      legshots: sums.legshots,
    },
    evaluation: {
      aimClass: classifyAim(hsPercentage),
      impactClass: classifyImpact(acs),
    },
  };
}

/** Hook de mira por faixa (texto pré-calculado para a IA de baixo custo). */
function buildAimHook(hsPercentage: number): string {
  if (hsPercentage >= COMBAT_THRESHOLDS.hsExcelente) {
    return `A mira é um ponto forte (HS% ${hsPercentage}%). Recomende usá-la como base da agressividade e posicionar o jogador para duelos de abertura.`;
  }
  if (hsPercentage >= COMBAT_THRESHOLDS.hsRegular) {
    return `A mira é regular (HS% ${hsPercentage}%). Sugira aquecimento com headshot-only deathmatch para converter mais duelos em abates rápidos.`;
  }
  return `O jogador está mirando no corpo (HS% ${hsPercentage}%, classificação "Crítica"). Sugira treino diário de mira na altura da cabeça: 10–15 min de deathmatch focado em headshot antes das ranqueadas.`;
}

/** Hook de impacto por faixa de ACS. */
function buildImpactHook(acs: number): string {
  if (acs >= COMBAT_THRESHOLDS.acsCarregador) {
    return `O jogador está carregando as partidas (ACS ${acs}). Recomende mantê-lo em papéis de entrada e construir a estratégia ao redor dele, protegendo-o em rounds de economia.`;
  }
  if (acs >= COMBAT_THRESHOLDS.acsEquilibrado) {
    return `Impacto consistente (ACS ${acs}). Sugira manter a regularidade e assumir mais responsabilidade nos rounds decisivos (clutch e pós-plant).`;
  }
  return `Impacto por rodada baixo (ACS ${acs}). Sugira participação mais ativa: entrar junto com as utilitárias, buscar trades e assumir duelos com vantagem posicional.`;
}

/** Hook de duelos de abertura (FB/FD) — o exemplo clássico do briefing. */
function buildEntryHook(firstBloods: number, firstDeaths: number): string {
  const ratio = firstDeaths === 0 ? firstBloods : firstBloods / firstDeaths;
  if (ratio < 1) {
    return `O jogador está morrendo no início da rodada (${firstBloods} first bloods contra ${firstDeaths} first deaths). Sugira jogar mais recuado nos primeiros segundos, deixar o duelo inicial para duelistas e priorizar sobreviver para o trade.`;
  }
  return `O jogador vence os duelos iniciais (${firstBloods} first bloods contra ${firstDeaths} first deaths). Sugira explorar isso com aberturas controladas, sempre com um companheiro por perto para o trade.`;
}

/**
 * Monta o envelope de 3 camadas (`CoachInsight`) para o chatbot MiniMax:
 * números exatos, rating semântico por métrica e hooks prontos para uso.
 * Delega toda a validação a `calculateCombatMetrics`.
 */
export function buildCombatCoachInsight(
  matches: readonly MatchCombatStats[],
): CoachInsight<CombatRawMetrics> {
  const metrics = calculateCombatMetrics(matches);
  const hooks: string[] = [];

  if (metrics.totals.matches < COMBAT_THRESHOLDS.amostraMinima) {
    hooks.push(
      `Amostra pequena: ${metrics.totals.matches} partidas analisadas. Avise o jogador que a análise tem baixa confiabilidade estatística e que a precisão aumenta com mais partidas.`,
    );
  }

  if (metrics.hsPercentage !== null) {
    hooks.push(buildAimHook(metrics.hsPercentage));
  }

  hooks.push(buildImpactHook(metrics.acs));

  if (metrics.kast !== null && metrics.kast < COMBAT_THRESHOLDS.kastBaixo) {
    hooks.push(
      `KAST de ${metrics.kast}% indica rodadas sem contribuição (kill/assist/sobrevivência/trade). Sugira posicionamento de suporte e entrada sincronizada com o time.`,
    );
  }

  if (metrics.firstBloods !== null && metrics.firstDeaths !== null) {
    hooks.push(buildEntryHook(metrics.firstBloods, metrics.firstDeaths));
  }

  const hs = metrics.hsPercentage;

  const raw_metrics: CombatRawMetrics = {
    kdr: metrics.kdr,
    kpr: metrics.kpr,
    acs: metrics.acs,
    matches: metrics.totals.matches,
    rounds: metrics.totals.rounds,
    ...(hs !== null ? { hsPercentage: hs } : {}),
    ...(metrics.kast !== null ? { kast: metrics.kast } : {}),
    ...(metrics.firstBloods !== null ? { firstBloods: metrics.firstBloods } : {}),
    ...(metrics.firstDeaths !== null ? { firstDeaths: metrics.firstDeaths } : {}),
  };

  const contextual_rating: Partial<Record<keyof CombatRawMetrics, ContextualRating>> = {
    kdr: rateMetric(metrics.kdr, COMBAT_BENCHMARKS.kdr, 'Crítico'),
    kpr: rateMetric(metrics.kpr, COMBAT_BENCHMARKS.kpr, 'Crítico'),
    acs: rateMetric(metrics.acs, COMBAT_BENCHMARKS.acs, 'Crítico'),
    ...(hs !== null
      ? { hsPercentage: rateMetric(hs, COMBAT_BENCHMARKS.hsPercentage, 'Crítico') }
      : {}),
    ...(metrics.kast !== null
      ? { kast: rateMetric(metrics.kast, COMBAT_BENCHMARKS.kast, 'Crítico') }
      : {}),
  };

  return { raw_metrics, contextual_rating, coaching_hooks: hooks };
}
