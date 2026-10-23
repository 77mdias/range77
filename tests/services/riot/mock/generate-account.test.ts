import { describe, expect, it } from 'vitest';
import { parseMatchRouteParams } from '@/lib/validation/match-params';
import {
  DEMO_ACCOUNT,
  MOCK_MATCHLIST_MAX,
  generateAccount,
  generateMatchlist,
  generateRankSnapshot,
  generateRrHistory,
  mockMatchIndex,
} from '@/services/riot/mock/generate-account';
import { generateMatch } from '@/services/riot/mock/generate-match';

const demo = generateAccount(DEMO_ACCOUNT.gameName, DEMO_ACCOUNT.tagLine);

describe('mock account', () => {
  it('DEMO_ACCOUNT é a conta fictícia fixa', () => {
    expect(DEMO_ACCOUNT).toEqual({ gameName: 'ValCoachDemo', tagLine: 'DEMO', region: 'br' });
  });

  it('generateAccount: puuid UUID v4-like, estável e independente de caixa', () => {
    expect(demo.puuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(generateAccount('valcoachdemo', 'demo').puuid).toBe(demo.puuid);
    expect(demo.gameName).toBe('ValCoachDemo');
    expect(demo.tagLine).toBe('DEMO');
    expect(generateAccount('Outro', 'DEMO').puuid).not.toBe(demo.puuid);
  });

  it('generateMatchlist: ids UUID aceitos pela rota, únicos, mais recente primeiro', () => {
    const list = generateMatchlist(demo, 30);
    expect(list.puuid).toBe(demo.puuid);
    expect(list.history).toHaveLength(30);
    expect(new Set(list.history.map((h) => h.matchId)).size).toBe(30);
    list.history.forEach((h, i) => {
      expect(parseMatchRouteParams('br', h.matchId).ok).toBe(true);
      expect(h.matchId).toBe(h.matchId.toLowerCase());
      expect(h.queueId).toBe('competitive');
      if (i > 0) expect(h.gameStartTimeMillis).toBeLessThan(list.history[i - 1]!.gameStartTimeMillis);
      expect(mockMatchIndex(h.matchId, demo)).toBe(i);
    });
    expect(JSON.stringify(generateMatchlist(demo, 30))).toBe(JSON.stringify(list));
    // Prefixo estável: lista maior começa com a menor.
    expect(generateMatchlist(demo, 40).history.slice(0, 30)).toEqual(list.history);
    expect(generateMatchlist(demo, -3).history).toHaveLength(0);
    expect(generateMatchlist(demo, MOCK_MATCHLIST_MAX + 50).history).toHaveLength(MOCK_MATCHLIST_MAX);
  });

  it('mockMatchIndex devolve null para id de outra conta', () => {
    const other = generateAccount('Capivara Ágil', 'BR77');
    const id = generateMatchlist(other, 1).history[0]!.matchId;
    expect(mockMatchIndex(id, demo)).toBeNull();
  });

  it('generateRankSnapshot: tier/RR plausíveis e determinísticos', () => {
    const snap = generateRankSnapshot(demo);
    expect(snap.puuid).toBe(demo.puuid);
    expect(snap.competitiveTier).toBeGreaterThanOrEqual(3);
    expect(snap.competitiveTier).toBeLessThanOrEqual(24);
    expect(snap.rankedRating).toBeGreaterThanOrEqual(0);
    expect(snap.rankedRating).toBeLessThanOrEqual(99);
    expect(generateRankSnapshot(demo)).toEqual(snap);
  });

  it('generateRrHistory: casa com matchlist, resultado e snapshot', () => {
    const snap = generateRankSnapshot(demo);
    const list = generateMatchlist(demo, 15);
    const history = generateRrHistory(demo, 15);
    expect(history).toHaveLength(15);
    expect(history[0]!.tierAfterUpdate).toBe(snap.competitiveTier);
    expect(history[0]!.rankedRatingAfterUpdate).toBe(snap.rankedRating);
    history.forEach((p, i) => {
      const entry = list.history[i]!;
      expect(p.matchId).toBe(entry.matchId);
      expect(p.matchStartMillis).toBe(entry.gameStartTimeMillis);
      expect(p.rankedRatingAfterUpdate).toBeGreaterThanOrEqual(0);
      expect(p.rankedRatingAfterUpdate).toBeLessThanOrEqual(99);
      // Encadeamento: o "depois" da partida mais antiga é o "antes" da seguinte.
      if (i > 0) expect(history[i]!.tierAfterUpdate).toBe(history[i - 1]!.tierBeforeUpdate);

      const match = generateMatch(p.matchId, demo);
      const me = match.players.find((pl) => pl.puuid === demo.puuid)!;
      const won = match.teams.find((t) => t.teamId === me.teamId)!.won;
      expect(p.rankedRatingEarned > 0).toBe(won);
      expect(me.competitiveTier).toBe(p.tierBeforeUpdate);
      expect(match.matchInfo.gameStartMillis).toBe(entry.gameStartTimeMillis);
    });
  });
});
