import { describe, expect, it } from 'vitest';
import { buildAgentSignatures } from '@/services/analytics/agent-signatures';
import type { MatchSummary } from '@/contracts/tracker';

/**
 * SUITE (100% obrigatório) — assinatura tática por agente: métrica por papel
 * derivada de dados reais, com guardas de divisão por zero e ausência
 * (`null`) quando não computável.
 */

function match(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    matchId: 'm',
    region: 'br',
    map: 'Ascent',
    queue: 'competitive',
    season: null,
    startedAt: '2026-01-01T00:00:00Z',
    gameLengthMs: 0,
    result: 'win',
    agent: 'Jett',
    teamId: 'Blue',
    score: { us: 13, them: 10 },
    kills: 10,
    deaths: 10,
    assists: 5,
    acs: 200,
    hsPercentage: 20,
    roundsPlayed: 20,
    ...overrides,
  };
}

describe('buildAgentSignatures', () => {
  it('sem partidas → mapa vazio', () => {
    expect(buildAgentSignatures([]).size).toBe(0);
  });

  it('duelista usa first blood conversion e ignora partidas sem timeline', () => {
    const signatures = buildAgentSignatures([
      match({ agent: 'Jett', firstBloods: 6, firstDeaths: 4 }),
      match({ agent: 'Jett', firstBloods: 4, firstDeaths: 1 }),
      match({ agent: 'Jett', firstDeaths: 3 }), // só FD exercita `firstBloods ?? 0`
      match({ agent: 'Jett', firstBloods: 2 }), // só FB exercita `firstDeaths ?? 0`
      match({ agent: 'Jett' }), // sem timeline → fora do cálculo
    ]);
    // fb = 12; fd = 8; duelos = 20 → 60%
    expect(signatures.get('Jett')).toEqual({
      label: 'First blood conversion',
      percent: 60,
      displayValue: '60% (12/20)',
    });
  });

  it('duelista sem timeline não tem assinatura', () => {
    expect(buildAgentSignatures([match({ agent: 'Jett' })]).has('Jett')).toBe(false);
  });

  it('duelista sem duelos de abertura (0/0) não tem assinatura', () => {
    const signatures = buildAgentSignatures([
      match({ agent: 'Jett', firstBloods: 0, firstDeaths: 0 }),
    ]);
    expect(signatures.has('Jett')).toBe(false);
  });

  it('iniciador e controlador usam assist share', () => {
    const signatures = buildAgentSignatures([
      match({ agent: 'Fade', kills: 30, assists: 10 }),
      match({ agent: 'Omen', kills: 20, assists: 20 }),
    ]);
    expect(signatures.get('Fade')).toEqual({
      label: 'Assist share',
      percent: 25,
      displayValue: '25% (10/40)',
    });
    expect(signatures.get('Omen')).toEqual({
      label: 'Assist share',
      percent: 50,
      displayValue: '50% (20/40)',
    });
  });

  it('sem kill participation não há assinatura', () => {
    const signatures = buildAgentSignatures([match({ agent: 'Fade', kills: 0, assists: 0 })]);
    expect(signatures.has('Fade')).toBe(false);
  });

  it('sentinela usa taxa de sobrevivência', () => {
    const signatures = buildAgentSignatures([
      match({ agent: 'Chamber', roundsPlayed: 40, deaths: 10 }),
    ]);
    expect(signatures.get('Chamber')).toEqual({
      label: 'Survival rate',
      percent: 75,
      displayValue: '75% (30/40)',
    });
  });

  it('sentinela sem rounds não tem assinatura', () => {
    const signatures = buildAgentSignatures([match({ agent: 'Chamber', roundsPlayed: 0 })]);
    expect(signatures.has('Chamber')).toBe(false);
  });

  it('deaths acima dos rounds nunca gera percentual negativo', () => {
    const signatures = buildAgentSignatures([
      match({ agent: 'Chamber', roundsPlayed: 10, deaths: 30 }),
    ]);
    expect(signatures.get('Chamber')?.percent).toBe(0);
  });

  it('papel desconhecido (ou agente ausente) não gera assinatura', () => {
    const signatures = buildAgentSignatures([match({ agent: 'Ultra' }), match({ agent: null })]);
    expect(signatures.size).toBe(0);
  });
});
