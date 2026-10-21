import { describe, expect, it } from 'vitest';
import { MOCK_AGENTS, MOCK_ROSTER } from '@/services/riot/mock/roster';

describe('mock roster', () => {
  it('nenhum nome real', () => {
    for (const p of MOCK_ROSTER) {
      const riotId = `${p.gameName}#${p.tagLine}`;
      for (const banned of ['twmz', 'tower', 'NOWAY']) {
        expect(riotId).not.toContain(banned);
        expect(riotId.toLowerCase()).not.toContain(banned.toLowerCase());
      }
    }
  });

  it('elenco tem gente suficiente para um lobby e Riot IDs únicos', () => {
    expect(MOCK_ROSTER.length).toBeGreaterThanOrEqual(20);
    const ids = new Set(MOCK_ROSTER.map((p) => `${p.gameName}#${p.tagLine}`.toLowerCase()));
    expect(ids.size).toBe(MOCK_ROSTER.length);
  });

  it('mains de cada jogador são agentes conhecidos', () => {
    const names = new Set(MOCK_AGENTS.map((a) => a.name));
    expect(MOCK_AGENTS.length).toBeGreaterThanOrEqual(10);
    for (const p of MOCK_ROSTER) {
      expect(p.mains.length).toBeGreaterThan(0);
      for (const m of p.mains) expect(names.has(m)).toBe(true);
    }
    for (const a of MOCK_AGENTS) expect(a.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
