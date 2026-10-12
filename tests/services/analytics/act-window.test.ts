import { describe, expect, it } from 'vitest';
import type { HenrikDevMmrV3SeasonEntry } from '@/contracts/henrikdev';
import {
  ACT_SAMPLE_CAP,
  ACT_SAMPLE_FALLBACK,
  resolveActMatchSample,
} from '@/services/analytics/act-window';

/**
 * SUITE TDD — amostra do Breakdown por ATO (analytics PURA, 100% coberta).
 * Deriva o nº de partidas a buscar do MMR v3 `seasonal[]`, com teto e
 * fallback; nunca inventa valor (contagem ausente/ inválida → fallback).
 */

const opts = { cap: ACT_SAMPLE_CAP, fallback: ACT_SAMPLE_FALLBACK };

const entry = (id: string, games: number | undefined): HenrikDevMmrV3SeasonEntry => ({
  season: { id, short: id.toUpperCase() },
  ...(games !== undefined ? { games } : {}),
});

describe('resolveActMatchSample', () => {
  it('usa as partidas do ato quando abaixo do teto', () => {
    expect(resolveActMatchSample('s1', [entry('s1', 8)], opts)).toBe(8);
  });

  it('aplica o teto quando o ato tem mais partidas que o máximo', () => {
    expect(resolveActMatchSample('s1', [entry('s1', 42)], opts)).toBe(ACT_SAMPLE_CAP);
  });

  it('trunca contagens fracionárias', () => {
    expect(resolveActMatchSample('s1', [entry('s1', 12.9)], opts)).toBe(12);
  });

  it('casa pelo id do ato da partida mais recente', () => {
    const seasonal = [entry('old', 40), entry('s1', 7)];
    expect(resolveActMatchSample('s1', seasonal, opts)).toBe(7);
  });

  it('ignora entradas sem "season" ao casar o ato', () => {
    expect(resolveActMatchSample('s1', [{ games: 30 }, entry('s1', 9)], opts)).toBe(9);
  });

  it('sem seasonId (null/undefined/vazio) → fallback', () => {
    expect(resolveActMatchSample(null, [entry('s1', 8)], opts)).toBe(ACT_SAMPLE_FALLBACK);
    expect(resolveActMatchSample(undefined, [entry('s1', 8)], opts)).toBe(ACT_SAMPLE_FALLBACK);
    expect(resolveActMatchSample('', [entry('s1', 8)], opts)).toBe(ACT_SAMPLE_FALLBACK);
  });

  it('sem seasonal (null/undefined) → fallback', () => {
    expect(resolveActMatchSample('s1', null, opts)).toBe(ACT_SAMPLE_FALLBACK);
    expect(resolveActMatchSample('s1', undefined, opts)).toBe(ACT_SAMPLE_FALLBACK);
  });

  it('ato sem entrada correspondente → fallback', () => {
    expect(resolveActMatchSample('s9', [entry('s1', 8)], opts)).toBe(ACT_SAMPLE_FALLBACK);
  });

  it('entrada sem "games" → fallback', () => {
    expect(resolveActMatchSample('s1', [entry('s1', undefined)], opts)).toBe(ACT_SAMPLE_FALLBACK);
  });

  it('contagem não finita (NaN/Infinity) → fallback', () => {
    expect(resolveActMatchSample('s1', [entry('s1', Number.NaN)], opts)).toBe(ACT_SAMPLE_FALLBACK);
    expect(
      resolveActMatchSample('s1', [entry('s1', Number.POSITIVE_INFINITY)], opts),
    ).toBe(ACT_SAMPLE_FALLBACK);
  });

  it('ato sem partidas jogadas (0 ou negativo) → fallback', () => {
    expect(resolveActMatchSample('s1', [entry('s1', 0)], opts)).toBe(ACT_SAMPLE_FALLBACK);
    expect(resolveActMatchSample('s1', [entry('s1', -3)], opts)).toBe(ACT_SAMPLE_FALLBACK);
  });
});
