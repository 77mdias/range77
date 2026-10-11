import { describe, expect, it } from 'vitest';
import type { HenrikDevMmrHistoryEntryV2 } from '@/contracts/henrikdev';
import {
  buildRrHistory,
  classifyRrDelta,
  computeRrNet,
  indexRrDeltaByMatchId,
} from '@/services/analytics/rr-trend';

/**
 * SUITE TDD — trajetória de RR (analytics pura). Cobre os ramos de
 * classificação, filtragem de entradas incompletas, ordenação cronológica
 * e soma líquida — exigido 100% em `services/analytics/**`.
 */

const entry = (
  overrides: Partial<HenrikDevMmrHistoryEntryV2>,
): HenrikDevMmrHistoryEntryV2 => ({
  match_id: 'm-1',
  rr: 50,
  last_change: 10,
  tier: { id: 18, name: 'Diamond 1' },
  date: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('classifyRrDelta', () => {
  it('ΔRR positivo → win', () => {
    expect(classifyRrDelta(15)).toBe('win');
  });

  it('ΔRR negativo → loss', () => {
    expect(classifyRrDelta(-8)).toBe('loss');
  });

  it('ΔRR zero → neutral (nunca rotula empate/teto como vitória)', () => {
    expect(classifyRrDelta(0)).toBe('neutral');
  });
});

describe('buildRrHistory', () => {
  it('lista ausente ou vazia → []', () => {
    expect(buildRrHistory(undefined)).toEqual([]);
    expect(buildRrHistory([])).toEqual([]);
  });

  it('normaliza entradas e deriva o resultado do sinal do delta', () => {
    const points = buildRrHistory([
      entry({ match_id: 'm-1', rr: 78, last_change: 18, date: '2026-10-01T00:00:00.000Z' }),
      entry({ match_id: 'm-2', rr: 60, last_change: -20, date: '2026-10-02T00:00:00.000Z' }),
      entry({ match_id: 'm-3', rr: 60, last_change: 0, date: '2026-10-03T00:00:00.000Z' }),
    ]);

    expect(points.map((point) => point.matchId)).toEqual(['m-1', 'm-2', 'm-3']);
    expect(points.map((point) => point.result)).toEqual(['win', 'loss', 'neutral']);
  });

  it('ordena cronologicamente mesmo com entrada do mais recente ao mais antigo', () => {
    const points = buildRrHistory([
      entry({ match_id: 'nova', date: '2026-10-05T00:00:00.000Z' }),
      entry({ match_id: 'antiga', date: '2026-10-01T00:00:00.000Z' }),
      entry({ match_id: 'meio', date: '2026-10-03T00:00:00.000Z' }),
    ]);

    expect(points.map((point) => point.matchId)).toEqual(['antiga', 'meio', 'nova']);
  });

  it('desempata datas iguais por matchId (ordem determinística)', () => {
    const points = buildRrHistory([
      entry({ match_id: 'z', date: '2026-10-01T00:00:00.000Z' }),
      entry({ match_id: 'a', date: '2026-10-01T00:00:00.000Z' }),
    ]);

    expect(points.map((point) => point.matchId)).toEqual(['a', 'z']);
  });

  it('omite entradas sem rr ou sem match_id (nunca inventa pontos)', () => {
    const points = buildRrHistory([
      entry({ match_id: 'ok', rr: 40 }),
      entry({ match_id: 'sem-rr', rr: undefined }),
      entry({ match_id: undefined }),
      entry({ match_id: '' }),
    ]);

    expect(points.map((point) => point.matchId)).toEqual(['ok']);
  });

  it('usa fallbacks quando tier/date/last_change faltam', () => {
    const points = buildRrHistory([
      entry({ match_id: 'm-1', tier: undefined, date: undefined, last_change: undefined }),
    ]);

    expect(points[0]).toMatchObject({
      matchId: 'm-1',
      tier: '—',
      tierId: 0,
      date: '',
      delta: 0,
      result: 'neutral',
    });
  });
});

describe('computeRrNet', () => {
  it('soma os deltas da janela', () => {
    const points = buildRrHistory([
      entry({ match_id: 'm-1', last_change: 18 }),
      entry({ match_id: 'm-2', last_change: -20 }),
      entry({ match_id: 'm-3', last_change: 6 }),
    ]);

    expect(computeRrNet(points)).toBe(4);
  });

  it('lista vazia → 0', () => {
    expect(computeRrNet([])).toBe(0);
  });
});

describe('indexRrDeltaByMatchId', () => {
  it('indexa o ΔRR por matchId (para casar com o histórico de partidas)', () => {
    const points = buildRrHistory([
      entry({ match_id: 'm-1', last_change: 18 }),
      entry({ match_id: 'm-2', last_change: -20 }),
    ]);

    const lookup = indexRrDeltaByMatchId(points);
    expect(lookup.get('m-1')).toBe(18);
    expect(lookup.get('m-2')).toBe(-20);
    expect(lookup.get('m-ausente')).toBeUndefined();
  });

  it('índice vazio quando não há pontos', () => {
    expect(indexRrDeltaByMatchId([]).size).toBe(0);
  });
});
