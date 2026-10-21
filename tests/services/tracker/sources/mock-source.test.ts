import { describe, expect, it } from 'vitest';
import { describeUpstreamError } from '@/lib/http/api-error';
import { ACT_SAMPLE_CAP, ACT_SAMPLE_FALLBACK } from '@/services/analytics/act-window';
import { createMockSource } from '@/services/tracker/sources/mock-source';
import { TRACKER_NOT_FOUND_ERROR_NAME } from '@/services/tracker/source';

/**
 * SUITE TDD — fonte SIMULADA (formato Riot) do tracker.
 * Determinística e sem rede: tudo deriva do Riot ID do foco.
 */

const DEMO = { region: 'br', name: 'ValCoachDemo', tag: 'DEMO' } as const;

const MATCH_LABELS = {
  notFoundCode: 'MATCH_NOT_FOUND',
  notFoundMessage: 'Partida não encontrada.',
};

describe('createMockSource', () => {
  const source = createMockSource();

  it('declara kind mock', () => {
    expect(source.kind).toBe('mock');
  });

  it('getPlayerSample devolve `size` partidas, rank e trajetória de RR', async () => {
    const sample = await source.getPlayerSample({ ...DEMO, size: 5 });

    expect(sample.matches).toHaveLength(5);
    expect(sample.combat).toHaveLength(5);
    expect(sample.details).toEqual([]);
    expect(sample.rank).not.toBeNull();
    expect(sample.rank?.tier).toEqual(expect.any(String));
    expect(sample.rrHistory.length).toBeGreaterThan(0);
    expect(sample.level).toEqual(expect.any(Number));
    expect(sample.cardSrc).toBeNull();
    for (const match of sample.matches) {
      expect(match.region).toBe('br');
      expect(match.matchId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    }
  });

  it('é determinística e ignora a caixa do Riot ID', async () => {
    const a = await source.getPlayerSample({ ...DEMO, size: 5 });
    const b = await source.getPlayerSample({ region: 'br', name: 'valcoachdemo', tag: 'demo', size: 5 });

    expect(b.matches.map((m) => m.matchId)).toEqual(a.matches.map((m) => m.matchId));
    expect(b.combat).toEqual(a.combat);
    expect(b.rank).toEqual(a.rank);
  });

  it('a região da consulta prevalece sobre a do gerador', async () => {
    const sample = await source.getPlayerSample({ ...DEMO, region: 'NA', size: 2 });
    expect(sample.matches.every((m) => m.region === 'na')).toBe(true);
  });

  it('actSample (Breakdown) devolve uma amostra de ato plausível, dentro do teto', async () => {
    const options = { cap: ACT_SAMPLE_CAP, fallback: ACT_SAMPLE_FALLBACK };
    const sample = await source.getPlayerSample({ ...DEMO, actSample: options });

    expect(sample.matches.length).toBeGreaterThan(5);
    expect(sample.matches.length).toBeLessThanOrEqual(ACT_SAMPLE_CAP);
    const again = await source.getPlayerSample({ ...DEMO, size: 1, actSample: options });
    expect(again.matches.length).toBe(sample.matches.length); // actSample > size
  });

  it('getMatchDetail regenera a partida do histórico a partir do foco', async () => {
    const sample = await source.getPlayerSample({ ...DEMO, size: 3 });
    const first = sample.matches[0];
    expect(first).toBeDefined();

    const detail = await source.getMatchDetail('br', first!.matchId, { name: 'VALCOACHDEMO', tag: 'demo' });

    expect(detail.matchId).toBe(first!.matchId);
    expect(detail.region).toBe('br');
    expect(detail.scoreboard).toHaveLength(10);
    expect(detail.map).toBe(first!.map);
  });

  it('getMatchDetail aceita o matchId em maiúsculas', async () => {
    const sample = await source.getPlayerSample({ ...DEMO, size: 1 });
    const id = sample.matches[0]!.matchId;
    const detail = await source.getMatchDetail('br', id.toUpperCase(), DEMO);
    expect(detail.matchId).toBe(id);
  });

  it('sem foco → erro de não encontrado mapeado para MATCH_NOT_FOUND', async () => {
    const sample = await source.getPlayerSample({ ...DEMO, size: 1 });
    const attempt = source.getMatchDetail('br', sample.matches[0]!.matchId);

    await expect(attempt).rejects.toMatchObject({ name: TRACKER_NOT_FOUND_ERROR_NAME });
    const error = await attempt.catch((e: unknown) => e);
    expect(describeUpstreamError(error, MATCH_LABELS)).toMatchObject({
      status: 404,
      code: 'MATCH_NOT_FOUND',
    });
  });

  it('matchId que não pertence ao foco → não encontrado (também após serialização do cache)', async () => {
    const attempt = source.getMatchDetail('br', '00000000-0000-4000-8000-000000000000', DEMO);
    await expect(attempt).rejects.toMatchObject({ name: TRACKER_NOT_FOUND_ERROR_NAME });

    // A fronteira `'use cache'` só preserva name/message.
    const serialized = new Error('x');
    serialized.name = TRACKER_NOT_FOUND_ERROR_NAME;
    expect(describeUpstreamError(serialized, MATCH_LABELS).code).toBe('MATCH_NOT_FOUND');
  });

  it('getPlayerCard → null (sem arte de cartão no mock)', async () => {
    expect(await source.getPlayerCard('ValCoachDemo', 'DEMO')).toBeNull();
  });
});
