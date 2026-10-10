import { describe, expect, it } from 'vitest';
import {
  BOTTLENECK_WINRATE_THRESHOLD,
  MAIN_WINRATE_THRESHOLD,
  MIN_SAMPLE,
  buildAgentCardProfiles,
  buildMapCardProfiles,
  classifyAgentTier,
  kdRatio,
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
      tier: 'main',
    });
    expect(profiles[1]).toMatchObject({
      name: 'Cypher',
      tier: 'bottleneck',
      hsPercent: null,
    });
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

describe('buildMapCardProfiles', () => {
  it('lista vazia → perfil vazio', () => {
    expect(buildMapCardProfiles([])).toEqual([]);
  });

  it('melhor/pior distintos e estável/neutro no meio do pool', () => {
    const profiles = buildMapCardProfiles([
      stat('Ascent', { winrate: 72, matches: 18 }),
      stat('Breeze', { winrate: 31, matches: 8 }),
      stat('Haven', { winrate: 55, matches: 10 }),
      stat('Split', { winrate: 48, matches: 10 }),
    ]);
    expect(profiles.map((profile) => profile.status)).toEqual([
      'best',
      'worst',
      'stable',
      'neutral',
    ]);
    expect(profiles[0]).toMatchObject({ name: 'Ascent', wins: 6, losses: 4, winRatePercent: 72 });
  });

  it('mapa único elegível não recebe extremo (best == worst)', () => {
    expect(buildMapCardProfiles([stat('Ascent', { winrate: 72 })])[0]?.status).toBe('stable');
    expect(buildMapCardProfiles([stat('Icebox', { winrate: 40 })])[0]?.status).toBe('neutral');
  });

  it('empate total entre elegíveis não elege extremos', () => {
    const profiles = buildMapCardProfiles([
      stat('Ascent', { winrate: 60 }),
      stat('Haven', { winrate: 60 }),
    ]);
    expect(profiles.map((profile) => profile.status)).toEqual(['stable', 'stable']);
  });

  it('mapa fora da amostra mínima fica neutro (mesmo com WR alto)', () => {
    const profiles = buildMapCardProfiles([
      stat('Ascent', { winrate: 70 }),
      stat('Pearl', { matches: 1, winrate: 100 }),
    ]);
    expect(profiles[0]?.status).toBe('stable');
    expect(profiles[1]?.status).toBe('neutral');
  });
});
