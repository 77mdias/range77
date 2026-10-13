import type {
  KillEvent,
  MatchHalfSplits,
  MatchHalves,
  MatchRound,
  MatchScoreboardRow,
} from '@/contracts/tracker';
import { formatRankChip } from '@/lib/format/rank';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: agregações puras do detalhe de partida.
 * ======================================================================
 *
 * Funções determinísticas sobre `KillEvent[]` / `MatchScoreboardRow[]`.
 * Rigor estatístico: nada é fabricado — first bloods, kills por arma, tipo de
 * encerramento do round e faixa de MMR saem exclusivamente dos dados
 * normalizados; campos que a HenrikDev não fornece (KAST, ECON rating) NÃO
 * são calculados aqui.
 */

/** FK/FD de um jogador (contagem). */
export interface PlayerFirstBloods {
  readonly firstBloods: number;
  readonly firstDeaths: number;
}

/** Tabela de first bloods indexada por puuid. */
export type FirstBloodTable = ReadonlyMap<string, PlayerFirstBloods>;

/** Kills agregadas por arma, com share e marcadores de abertura/round. */
export interface WeaponKillStat {
  readonly weapon: string;
  readonly kills: number;
  /** % (0–100, 1 casa) sobre o total de kills com arma conhecida. */
  readonly sharePercent: number;
  /** Abates com a arma que foram o FIRST BLOOD do round. */
  readonly firstKills: number;
  /** Qtd. de rounds distintos em que a arma produziu ao menos um abate. */
  readonly rounds: number;
}

/** Totais agregados de um time na partida. */
export interface TeamTotals {
  readonly teamId: string;
  readonly players: number;
  readonly totalDamage: number;
  readonly totalKills: number;
  readonly totalDeaths: number;
  readonly totalAssists: number;
}

/** `a` ocorreu antes de `b` (match-time; time-in-round como desempate). */
function isEarlierKill(a: KillEvent, b: KillEvent): boolean {
  if (a.timeInMatchMs !== b.timeInMatchMs) {
    return a.timeInMatchMs < b.timeInMatchMs;
  }
  return (a.timeInRoundMs ?? Number.POSITIVE_INFINITY) <
    (b.timeInRoundMs ?? Number.POSITIVE_INFINITY);
}

/** PRIMEIRO abate de cada round (menor tempo; desempate intra-round). */
function selectFirstKillsByRound(kills: readonly KillEvent[]): ReadonlyMap<number, KillEvent> {
  const firstByRound = new Map<number, KillEvent>();
  for (const kill of kills) {
    const current = firstByRound.get(kill.roundNumber);
    if (current === undefined || isEarlierKill(kill, current)) {
      firstByRound.set(kill.roundNumber, kill);
    }
  }
  return firstByRound;
}

/**
 * Conta FK/FD por puuid a partir do PRIMEIRO abate de cada round. Puuids
 * vazios (eventos sem autor/vítima resolvidos) não entram na tabela.
 */
export function computeFirstBloods(kills: readonly KillEvent[]): FirstBloodTable {
  const firstByRound = selectFirstKillsByRound(kills);

  const table = new Map<string, { firstBloods: number; firstDeaths: number }>();
  const bump = (puuid: string, key: 'firstBloods' | 'firstDeaths'): void => {
    if (puuid === '') {
      return;
    }
    const entry = table.get(puuid) ?? { firstBloods: 0, firstDeaths: 0 };
    entry[key] += 1;
    table.set(puuid, entry);
  };

  for (const kill of firstByRound.values()) {
    bump(kill.killerPuuid, 'firstBloods');
    bump(kill.victimPuuid, 'firstDeaths');
  }

  return table;
}

/**
 * Agrega kills por arma (match inteiro ou de um jogador via `killerPuuid`),
 * incluindo quantos abates foram first blood do round e em quantos rounds a
 * arma esteve ativa. Armas desconhecidas (`null`/vazio) são excluídas. Ordena
 * por kills desc e, em empate, por nome asc.
 */
export function aggregateWeaponKills(
  kills: readonly KillEvent[],
  killerPuuid?: string,
): readonly WeaponKillStat[] {
  const firstByRound = selectFirstKillsByRound(kills);
  const stats = new Map<
    string,
    { kills: number; firstKills: number; rounds: Set<number> }
  >();
  let total = 0;

  for (const kill of kills) {
    if (killerPuuid !== undefined && kill.killerPuuid !== killerPuuid) {
      continue;
    }
    if (kill.weapon === null || kill.weapon === '') {
      continue;
    }
    const entry =
      stats.get(kill.weapon) ?? { kills: 0, firstKills: 0, rounds: new Set<number>() };
    entry.kills += 1;
    if (firstByRound.get(kill.roundNumber) === kill) {
      entry.firstKills += 1;
    }
    entry.rounds.add(kill.roundNumber);
    stats.set(kill.weapon, entry);
    total += 1;
  }

  return [...stats.entries()]
    .map(([weapon, entry]) => ({
      weapon,
      kills: entry.kills,
      sharePercent: roundTo((entry.kills / total) * 100, 1),
      firstKills: entry.firstKills,
      rounds: entry.rounds.size,
    }))
    .sort((a, b) => (b.kills === a.kills ? a.weapon.localeCompare(b.weapon) : b.kills - a.kills));
}

/**
 * Seleciona o MVP da partida: maior ACS, desempate por kills e, por fim, nome
 * ascendente (determinístico). Lista vazia → `null`.
 */
export function selectMatchMvp(
  rows: readonly MatchScoreboardRow[],
): MatchScoreboardRow | null {
  let best: MatchScoreboardRow | null = null;
  for (const row of rows) {
    if (best === null) {
      best = row;
      continue;
    }
    if (row.acs > best.acs) {
      best = row;
      continue;
    }
    if (row.acs < best.acs) {
      continue;
    }
    if (row.kills > best.kills) {
      best = row;
      continue;
    }
    if (row.kills === best.kills && row.name.localeCompare(best.name) < 0) {
      best = row;
    }
  }
  return best;
}

/** Rounds de um half regulamentar (12) — OT fica fora do rótulo DEF/ATK. */
const REGULATION_HALF_ROUNDS = 12;

/** Time atacante de cada half regulamentar (inferido dos plants). */
interface AttackerSides {
  readonly first: string;
  readonly second: string;
}

/**
 * Infere o time ATACANTE de cada half pelos plants (só o atacante planta).
 * Se um half não tem plant, usamos o outro (os lados trocam). Devolve `null`
 * quando não dá para determinar sem chutar (sem plant em nenhum half, menos de
 * dois times, lista vazia ou overtime > 24 rounds).
 */
function resolveAttackers(rounds: readonly MatchRound[]): AttackerSides | null {
  if (rounds.length === 0 || rounds.length > REGULATION_HALF_ROUNDS * 2) {
    return null;
  }

  const teamIds = [...new Set(rounds.map((round) => round.winningTeamId))];
  if (teamIds.length < 2) {
    return null;
  }

  const attackIn = (predicate: (roundNumber: number) => boolean): string | null =>
    rounds.find((round) => predicate(round.roundNumber) && round.plantTeamId !== null)
      ?.plantTeamId ?? null;

  const attackFirst = attackIn((n) => n <= REGULATION_HALF_ROUNDS);
  const attackSecond = attackIn((n) => n > REGULATION_HALF_ROUNDS);

  const opponentOf = (team: string): string | undefined => teamIds.find((id) => id !== team);
  const first = attackFirst ?? (attackSecond !== null ? opponentOf(attackSecond) : undefined);
  const second = attackSecond ?? (attackFirst !== null ? opponentOf(attackFirst) : undefined);
  if (first === undefined || second === undefined) {
    return null;
  }

  return { first, second };
}

/** Lado do time pedido num round, na inferência dos plants; `null` sem base. */
function roundSide(
  round: MatchRound,
  teamId: string,
  sides: AttackerSides | null,
): RoundSide | null {
  if (sides === null) {
    return null;
  }
  const attacking = round.roundNumber <= REGULATION_HALF_ROUNDS ? sides.first : sides.second;
  return attacking === teamId ? 'attack' : 'defense';
}

/** Reexport do contrato: mantém a superfície pública histórica de `analytics`. */
export type { MatchHalves };

/**
 * Divide os rounds regulamentares (≤24) por LADO do time pedido, na
 * perspectiva desse time. O payload v4 não traz o lado inicial; inferimos o
 * time atacante de cada half pelo `plantTeamId`. Partidas com OT (>24 rounds)
 * devolvem `null`: os lados extra não seguem o padrão regulamentar e rotulá-los
 * seria enganoso.
 */
export function computeMatchHalves(
  rounds: readonly MatchRound[],
  teamId: string,
): MatchHalves | null {
  const sides = resolveAttackers(rounds);
  if (sides === null) {
    return null;
  }

  const defense = { won: 0, lost: 0 };
  const attack = { won: 0, lost: 0 };
  for (const round of rounds) {
    const attackingTeam =
      round.roundNumber <= REGULATION_HALF_ROUNDS ? sides.first : sides.second;
    const side = attackingTeam === teamId ? attack : defense;
    if (round.winningTeamId === teamId) {
      side.won += 1;
    } else {
      side.lost += 1;
    }
  }

  return { defense, attack };
}

/**
 * Divide os rounds em METADES por `roundNumber` na perspectiva do time pedido:
 * HALF-ONE = rounds 1–12, HALF-TWO = rounds 13+ (overtime incluído na 2ª).
 * Diferente de `computeMatchHalves`, não depende de inferir o lado atacante —
 * é sempre computável a partir do placar de rounds. Lista vazia → `null`.
 */
export function computeHalfSplits(
  rounds: readonly MatchRound[],
  teamId: string,
): MatchHalfSplits | null {
  if (rounds.length === 0) {
    return null;
  }

  const first = { won: 0, lost: 0 };
  const second = { won: 0, lost: 0 };
  for (const round of rounds) {
    const half = round.roundNumber <= REGULATION_HALF_ROUNDS ? first : second;
    if (round.winningTeamId === teamId) {
      half.won += 1;
    } else {
      half.lost += 1;
    }
  }

  return { first, second };
}

/**
 * ADR — dano por round (dano total causado / rounds jogados). Sem rounds
 * (> 0) devolve `null` em vez de dividir por zero. Arredonda a 1 casa.
 */
export function computeAdr(damageDealt: number, roundsPlayed: number): number | null {
  if (roundsPlayed <= 0) {
    return null;
  }
  return roundTo(damageDealt / roundsPlayed, 1);
}

/** Soma dano/kills/deaths/assists de um time. Time ausente → zeros. */
export function computeTeamTotals(
  teamId: string,
  rows: readonly MatchScoreboardRow[],
): TeamTotals {
  let players = 0;
  let totalDamage = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  for (const row of rows) {
    if (row.teamId !== teamId) {
      continue;
    }
    players += 1;
    totalDamage += row.damageDealt;
    totalKills += row.kills;
    totalDeaths += row.deaths;
    totalAssists += row.assists;
  }
  return { teamId, players, totalDamage, totalKills, totalDeaths, totalAssists };
}

// ----------------------------------------------------------------------
// Timeline de rounds — tipo de encerramento + placar acumulado
// ----------------------------------------------------------------------

/** Como o round terminou, derivado de plant/defuse e das mortes do round. */
export type RoundWinKind = 'elim' | 'plant' | 'defuse' | 'retake' | 'time';

/** Lado do time de referência no round. */
export type RoundSide = 'attack' | 'defense';

/** Round enriquecido para a fita compacta (perspectiva de um time). */
export interface RoundInsight {
  readonly roundNumber: number;
  readonly winningTeamId: string;
  /** Vencedor é o time de referência? */
  readonly won: boolean;
  /** Lado do time de referência; `null` se indeterminável (OT/plant ausente). */
  readonly side: RoundSide | null;
  /** Tipo de encerramento do round. */
  readonly kind: RoundWinKind;
  /** 1º round de cada half regulamentar (pistola). */
  readonly pistol: boolean;
  /** Placar acumulado do time de referência APÓS este round. */
  readonly score: { readonly us: number; readonly them: number };
}

/** Resumo agregado da timeline (perspectiva do time de referência). */
export interface RoundTimelineSummary {
  readonly roundsWon: number;
  readonly roundsLost: number;
  readonly roundsTotal: number;
  /** % de rounds vencidos (0–100, 1 casa); sem rounds → `null`. */
  readonly winPercent: number | null;
  readonly pistol: {
    readonly won: number;
    readonly played: number;
    /** % de pistolas convertidas (0–100, 1 casa); sem pistola → `null`. */
    readonly percent: number | null;
  };
}

/** Timeline pronta: rounds + resumo. */
export interface RoundTimelineResult {
  readonly rounds: readonly RoundInsight[];
  readonly summary: RoundTimelineSummary;
}

/** Mapa vazio compartilhado (round sem abates registrados). */
const NO_DEATHS: ReadonlyMap<string, Set<string>> = new Map();

/**
 * Classifica o encerramento de um round:
 * - `defuse`: o round teve defuse (vitória da defesa).
 * - `plant`: o time atacante venceu um round com plant (detonação/eliminação).
 * - `retake`: a defesa venceu após o plant sem defuse.
 * - `elim`: sem plant e o time derrotado foi totalmente eliminado.
 * - `time`: sem plant e o time derrotado sobreviveu (tempo esgotado).
 */
function classifyRoundEnd(
  round: MatchRound,
  deathsByTeam: ReadonlyMap<string, Set<string>>,
  rosterSize: ReadonlyMap<string, number>,
): RoundWinKind {
  if (round.defused) {
    return 'defuse';
  }
  if (round.plantTeamId !== null) {
    return round.winningTeamId === round.plantTeamId ? 'plant' : 'retake';
  }
  for (const [team, size] of rosterSize) {
    if (team === round.winningTeamId) {
      continue;
    }
    if ((deathsByTeam.get(team)?.size ?? 0) >= size) {
      return 'elim';
    }
  }
  return 'time';
}

/**
 * Monta a timeline de rounds na perspectiva do time `perspectiveTeamId`:
 * classifica o encerramento de cada round, marca pistolas, resolve o lado
 * lateral e acumula o placar. `rounds` é ordenado por número (defensivo).
 */
export function computeRoundTimeline(
  rounds: readonly MatchRound[],
  kills: readonly KillEvent[],
  rows: readonly MatchScoreboardRow[],
  perspectiveTeamId: string,
): RoundTimelineResult {
  const sides = resolveAttackers(rounds);

  const rosterSize = new Map<string, number>();
  const teamByPuuid = new Map<string, string>();
  for (const row of rows) {
    teamByPuuid.set(row.puuid, row.teamId);
    rosterSize.set(row.teamId, (rosterSize.get(row.teamId) ?? 0) + 1);
  }

  const deathsByRound = new Map<number, Map<string, Set<string>>>();
  for (const kill of kills) {
    const team = teamByPuuid.get(kill.victimPuuid);
    if (team === undefined) {
      continue;
    }
    const byTeam = deathsByRound.get(kill.roundNumber) ?? new Map<string, Set<string>>();
    const victims = byTeam.get(team) ?? new Set<string>();
    victims.add(kill.victimPuuid);
    byTeam.set(team, victims);
    deathsByRound.set(kill.roundNumber, byTeam);
  }

  const ordered = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const insights: RoundInsight[] = [];
  let us = 0;
  let them = 0;
  let pistolWon = 0;
  let pistolPlayed = 0;

  for (const round of ordered) {
    const won = round.winningTeamId === perspectiveTeamId;
    if (won) {
      us += 1;
    } else {
      them += 1;
    }

    const pistol =
      round.roundNumber === 1 || round.roundNumber === REGULATION_HALF_ROUNDS + 1;
    if (pistol) {
      pistolPlayed += 1;
      if (won) {
        pistolWon += 1;
      }
    }

    insights.push({
      roundNumber: round.roundNumber,
      winningTeamId: round.winningTeamId,
      won,
      side: roundSide(round, perspectiveTeamId, sides),
      kind: classifyRoundEnd(
        round,
        deathsByRound.get(round.roundNumber) ?? NO_DEATHS,
        rosterSize,
      ),
      pistol,
      score: { us, them },
    });
  }

  return {
    rounds: insights,
    summary: {
      roundsWon: us,
      roundsLost: them,
      roundsTotal: us + them,
      winPercent: us + them > 0 ? roundTo((us / (us + them)) * 100, 1) : null,
      pistol: {
        won: pistolWon,
        played: pistolPlayed,
        percent: pistolPlayed > 0 ? roundTo((pistolWon / pistolPlayed) * 100, 1) : null,
      },
    },
  };
}

// ----------------------------------------------------------------------
// Faixa de MMR da partida (menor–maior tier presente no scoreboard)
// ----------------------------------------------------------------------

/** Ordem base dos tiers (maior = mais alto) para calcular a faixa. */
const TIER_ORDER: Readonly<Record<string, number>> = {
  unranked: 0,
  iron: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
  diamond: 6,
  ascendant: 7,
  immortal: 8,
  radiant: 9,
};

/** Ordena um tier textual ("Ascendant 3") por base×10 + divisão. */
function tierOrder(tier: string): number | null {
  const normalized = tier.trim().toLowerCase();
  for (const [word, base] of Object.entries(TIER_ORDER)) {
    if (normalized === word || normalized.startsWith(`${word} `)) {
      const divisionText = normalized.slice(word.length).trim();
      const division = divisionText === '' ? 0 : Number.parseInt(divisionText, 10);
      return base * 10 + (Number.isNaN(division) ? 0 : division);
    }
  }
  return null;
}

/**
 * Faixa de MMR da partida no formato do Stitch ("ASC 1 — IMM 2"), derivada
 * dos tiers reais do scoreboard. Sem tiers reconhecidos → `null` (nada a
 * exibir). Um único tier → devolve o próprio chip, sem range falso.
 */
export function computeRankRange(rows: readonly MatchScoreboardRow[]): string | null {
  let minOrder = Number.POSITIVE_INFINITY;
  let maxOrder = Number.NEGATIVE_INFINITY;
  let minTier = '';
  let maxTier = '';
  let count = 0;

  for (const row of rows) {
    if (row.tier === null || row.tier.trim() === '') {
      continue;
    }
    const tier = row.tier.trim();
    const order = tierOrder(tier);
    if (order === null) {
      continue;
    }
    count += 1;
    if (order < minOrder) {
      minOrder = order;
      minTier = tier;
    }
    if (order > maxOrder) {
      maxOrder = order;
      maxTier = tier;
    }
  }

  if (count === 0) {
    return null;
  }
  const low = formatRankChip(minTier).toUpperCase();
  const high = formatRankChip(maxTier).toUpperCase();
  return minOrder === maxOrder ? low : `${low} — ${high}`;
}
