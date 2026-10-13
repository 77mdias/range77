import { describe, expect, it } from 'vitest';
import {
  BOTTLENECK_WINRATE_THRESHOLD,
  MAIN_WINRATE_THRESHOLD,
  MIN_SAMPLE,
  buildAgentCardProfiles,
  buildMapPoolAdvice,
  buildMapCardProfiles,
  classifyAgentTier,
  classifyMapStatus,
  kdRatio,
  sortAgentProfiles,
} from '@/services/analytics/agent-map-profiles';
import type { GroupedStat } from '@/contracts/tracker';

/**
 * SUITE (100% obrigatório) — perfis de agente/mapa da aba "Agentes &
 * Mapas": classificação de tier, status no map pool e derivações puras.
 */

function stat(key: string, overrides: Partial<GroupedStat> = {}): GroupedStat {
  return {
    matches: 10,
    wins: 6,
    losses: 4,
    winrate: 60,
    avgKills: 15,
    avgDeaths: 12,
    avgAssists: 5,
    kda: 1.67,
    avgAcs: 230,
    avgHsPercentage: 25,
    ...overrides,
    key: overrides.key ?? key,
  };
}

describe('thresholds exportados', () => {
  it('expõe os valores do contrato de classificação', () => {
    expect(MAIN_WINRATE_THRESHOLD).toBe(50);
    expect(BOTTLENECK_WINRATE_THRESHOLD).toBe(45);
    expect(MIN_SAMPLE).toBe(3);
  });
});

describe('classifyAgentTier', () => {
  it('gargalo tem precedência: WR < 45 vira bottleneck mesmo sendo o melhor', () => {
    expect(classifyAgentTier(44.9, 10, true)).toBe('bottleneck');
  });

  it('WR exatamente 45 NÃO é bottleneck (limite estrito)', () => {
    expect(classifyAgentTier(45, 10, false)).toBe('solid');
  });

  it('main exige melhor da amostra + WR >= 50 + amostra mínima', () => {
    expect(classifyAgentTier(50, MIN_SAMPLE, true)).toBe('main');
  });

  it('melhor WR, mas abaixo de 50 → solid', () => {
    expect(classifyAgentTier(48, 10, true)).toBe('solid');
  });

  it('melhor WR, mas amostra abaixo do mínimo → solid', () => {
    expect(classifyAgentTier(70, MIN_SAMPLE - 1, true)).toBe('solid');
  });

  it('não-best na faixa 45–50 → solid', () => {
    expect(classifyAgentTier(46, 10, false)).toBe('solid');
  });
});

describe('kdRatio', () => {
  it('divide kills/deaths normalmente', () => {
    expect(kdRatio(15, 12)).toBeCloseTo(1.25);
  });

  it('deaths=0 → kills (convenção do contrato, nunca Infinity)', () => {
    expect(kdRatio(20, 0)).toBe(20);
  });
});

describe('buildAgentCardProfiles', () => {
  it('lista vazia → perfil vazio', () => {
    expect(buildAgentCardProfiles([])).toEqual([]);
  });

  it('deriva métricas e marca o melhor elegível como main', () => {
    const profiles = buildAgentCardProfiles([
      stat('Jett', { winrate: 65, avgAcs: 265, avgKills: 18, avgDeaths: 11, avgHsPercentage: 32 }),
      stat('Cypher', { winrate: 40, avgKills: 10, avgDeaths: 15, avgHsPercentage: null }),
    ]);
    expect(profiles).toHaveLength(2);
    expect(profiles[0]).toMatchObject({
      name: 'Jett',
      matches: 10,
      winRatePercent: 65,
      avgAcs: 265,
      kdRatio: expect.closeTo(18 / 11),
      hsPercent: 32,
      kdDelta: expect.closeTo(0.59),
      acsDelta: 50,
      tier: 'main',
    });
    expect(profiles[1]).toMatchObject({
      name: 'Cypher',
      tier: 'bottleneck',
      hsPercent: null,
    });
  });

  it('ordena por ACS decrescente com desempate alfabético', () => {
    const profiles = buildAgentCardProfiles([
      stat('Zephyr', { avgAcs: 200 }),
      stat('Ascent', { avgAcs: 260 }),
      stat('Brim', { avgAcs: 200 }),
    ]);
    expect(profiles.map((profile) => profile.name)).toEqual(['Ascent', 'Brim', 'Zephyr']);
  });

  it('delta do benchmark fica zero quando o K/D e o ACS batem com a referência', () => {
    const profiles = buildAgentCardProfiles([
      stat('Jett', { avgKills: 21, avgDeaths: 20, avgAcs: 215 }),
    ]);
    expect(profiles[0]?.kdDelta).toBe(0);
    expect(profiles[0]?.acsDelta).toBe(0);
  });

  it('agente com amostra baixa nunca vira main (mesmo com WR alto)', () => {
    const profiles = buildAgentCardProfiles([stat('Neon', { matches: 2, winrate: 80 })]);
    expect(profiles[0]?.tier).toBe('solid');
  });

  it('único agente com WR < 45 é bottleneck (precedência sobre main)', () => {
    const profiles = buildAgentCardProfiles([stat('Cypher', { winrate: 42 })]);
    expect(profiles[0]?.tier).toBe('bottleneck');
  });
});

describe('sortAgentProfiles', () => {
  // Jett: ACS 265, WR 65, K/D 18/11 (1.64), HS 32 · Omen: ACS 210, WR 52,
  // K/D 1.0, HS 25 · Cypher: ACS 150, WR 40, K/D 0.67, HS ausente.
  const base = buildAgentCardProfiles([
    stat('Jett', { winrate: 65, avgAcs: 265, avgKills: 18, avgDeaths: 11, avgHsPercentage: 32 }),
    stat('Cypher', { winrate: 40, avgAcs: 150, avgKills: 10, avgDeaths: 15, avgHsPercentage: null }),
    stat('Omen', { winrate: 52, avgAcs: 210, avgKills: 12, avgDeaths: 12, avgHsPercentage: 25 }),
  ]);

  const names = (profiles: ReturnType<typeof sortAgentProfiles>): string[] =>
    profiles.map((profile) => profile.name);

  it('lista vazia → lista vazia', () => {
    expect(sortAgentProfiles([])).toEqual([]);
  });

  it('padrão: ACS decrescente (assinatura atual)', () => {
    expect(names(sortAgentProfiles(base))).toEqual(['Jett', 'Omen', 'Cypher']);
  });

  it('ordena por win rate decrescente', () => {
    expect(names(sortAgentProfiles(base, 'winrate'))).toEqual(['Jett', 'Omen', 'Cypher']);
  });

  it('ordena por K/D decrescente', () => {
    expect(names(sortAgentProfiles(base, 'kd'))).toEqual(['Jett', 'Omen', 'Cypher']);
  });

  it('ordena por HS% decrescente mantendo o nulo no fim', () => {
    expect(names(sortAgentProfiles(base, 'hs'))).toEqual(['Jett', 'Omen', 'Cypher']);
  });

  it('direção crescente inverte a ordem e também joga o nulo para o fim', () => {
    expect(names(sortAgentProfiles(base, 'hs', 'asc'))).toEqual(['Omen', 'Jett', 'Cypher']);
  });

  it('empate desempata pelo nome (ascendente)', () => {
    const tied = buildAgentCardProfiles([
      stat('Zephyr', { avgAcs: 200 }),
      stat('Ascent', { avgAcs: 200 }),
      stat('Brim', { avgAcs: 200 }),
    ]);
    expect(names(sortAgentProfiles(tied, 'matches'))).toEqual(['Ascent', 'Brim', 'Zephyr']);
  });

  it('reordena quando a entrada não está na ordem alvo', () => {
    const ascending = [...base].reverse(); // Cypher, Omen, Jett
    expect(names(sortAgentProfiles(ascending, 'acs', 'desc'))).toEqual(['Jett', 'Omen', 'Cypher']);
  });

  it('não muta a lista de entrada', () => {
    const input = buildAgentCardProfiles([
      stat('Jett', { avgAcs: 265 }),
      stat('Omen', { avgAcs: 210 }),
    ]);
    const before = input.map((profile) => profile.name);
    sortAgentProfiles(input, 'winrate', 'asc');
    expect(input.map((profile) => profile.name)).toEqual(before);
  });
});

describe('classifyMapStatus', () => {
  it('mapeia cada faixa de WR (melhor ≥60, positivo ≥55, estável ≥50, neutro ≥45, desfavorável ≥30, pior <30)', () => {
    expect(classifyMapStatus(100)).toBe('best');
    expect(classifyMapStatus(60)).toBe('best');
    expect(classifyMapStatus(59.9)).toBe('good');
    expect(classifyMapStatus(55)).toBe('good');
    expect(classifyMapStatus(50)).toBe('stable');
    expect(classifyMapStatus(45)).toBe('neutral');
    expect(classifyMapStatus(33.3)).toBe('unfavorable');
    expect(classifyMapStatus(30)).toBe('unfavorable');
    expect(classifyMapStatus(29.9)).toBe('worst');
    expect(classifyMapStatus(0)).toBe('worst');
  });
});

describe('buildMapCardProfiles', () => {
  it('lista vazia → perfil vazio', () => {
    expect(buildMapCardProfiles([])).toEqual([]);
  });

  it('classifica cada mapa só pela faixa de WR real (sem extremos relativos)', () => {
    const profiles = buildMapCardProfiles([
      stat('Ascent', { winrate: 72, matches: 18, wins: 6, losses: 4 }),
      stat('Breeze', { winrate: 31, matches: 8 }),
      stat('Haven', { winrate: 55, matches: 10 }),
      stat('Split', { winrate: 48, matches: 10 }),
      stat('Icebox', { winrate: 33 }),
    ]);
    expect(profiles.map((profile) => profile.status)).toEqual([
      'best',
      'unfavorable',
      'good',
      'neutral',
      'unfavorable',
    ]);
    expect(profiles[0]).toMatchObject({ name: 'Ascent', wins: 6, losses: 4, winRatePercent: 72 });
  });

  it('mapa com amostra baixa recebe status pela faixa (a amostra segue visível)', () => {
    expect(buildMapCardProfiles([stat('Pearl', { matches: 1, winrate: 100 })])[0]?.status).toBe(
      'best',
    );
  });

  it('WR exatamente na borda entra na faixa superior', () => {
    expect(buildMapCardProfiles([stat('Lotus', { winrate: 50 })])[0]?.status).toBe('stable');
    expect(buildMapCardProfiles([stat('Sunset', { winrate: 45 })])[0]?.status).toBe('neutral');
  });

  it('empate total entre mapas não muda a classificação por faixa', () => {
    const profiles = buildMapCardProfiles([
      stat('Ascent', { winrate: 60 }),
      stat('Haven', { winrate: 60 }),
    ]);
    expect(profiles.map((profile) => profile.status)).toEqual(['best', 'best']);
  });
});

describe('buildMapPoolAdvice', () => {
  it('deriva conselho do pior mapa elegível e cita o melhor distinto', () => {
    const advice = buildMapPoolAdvice([
      stat('Ascent', { matches: 18, winrate: 72 }),
      stat('Breeze', { matches: 8, winrate: 31 }),
      stat('Split', { matches: 2, winrate: 100 }),
    ]);
    expect(advice).toEqual({
      worstMap: 'Breeze',
      worstWinRate: 31,
      worstMatches: 8,
      bestMap: 'Ascent',
      bestWinRate: 72,
    });
  });

  it('mapa único elegível: conselho sem melhor distinto', () => {
    const advice = buildMapPoolAdvice([stat('Icebox', { matches: 5, winrate: 40 })]);
    expect(advice).toEqual({
      worstMap: 'Icebox',
      worstWinRate: 40,
      worstMatches: 5,
      bestMap: null,
      bestWinRate: null,
    });
  });

  it('sem amostra elegível não há conselho (nada fabricado)', () => {
    expect(buildMapPoolAdvice([])).toBeNull();
    expect(buildMapPoolAdvice([stat('Ascent', { matches: 1, winrate: 10 })])).toBeNull();
  });
});
