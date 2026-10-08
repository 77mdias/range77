import { describe, expect, it } from 'vitest';
import type {
  HenrikDevKillV4,
  HenrikDevMatchV4,
  HenrikDevPlayerV4,
} from '@/contracts/henrikdev';
import { normalizeMatchesToCombat } from '@/services/henrikdev/normalize';

/**
 * SUITE TDD — normalizador HenrikDev v4 → MatchCombatStats.
 *
 * Valida o "heavy lifting" de extração: localizar o jogador (case-insensitive),
 * derivar rounds de `teams`, calcular First Bloods/Deaths reais a partir da
 * timeline `kills[]` e filtrar partidas irrelevantes (outra fila, incompleta,
 * jogador ausente, dados malformados).
 */

const makePlayer = (overrides: Partial<HenrikDevPlayerV4> = {}): HenrikDevPlayerV4 => ({
  puuid: 'puuid-player',
  name: 'Player',
  tag: 'BR1',
  team_id: 'Red',
  stats: {
    score: 4000,
    kills: 20,
    deaths: 10,
    assists: 5,
    headshots: 10,
    bodyshots: 20,
    legshots: 10,
  },
  ...overrides,
});

const makeKill = (
  round: number,
  timeInMatchMs: number,
  killer: string,
  victim: string,
): HenrikDevKillV4 => ({
  round,
  time_in_match_in_ms: timeInMatchMs,
  killer: { puuid: killer, name: killer, tag: 'TAG' },
  victim: { puuid: victim, name: victim, tag: 'TAG' },
  assistants: [],
});

const makeMatch = (overrides: Partial<HenrikDevMatchV4> = {}): HenrikDevMatchV4 => ({
  metadata: {
    match_id: 'm-1',
    map: { id: 'ascent', name: 'Ascent' },
    queue: { id: 'competitive' },
    is_completed: true,
  },
  players: [makePlayer(), makePlayer({ puuid: 'puuid-ally', name: 'Ally', tag: 'BR2' })],
  teams: [
    { team_id: 'Red', rounds: { won: 13, lost: 9 }, won: true },
    { team_id: 'Blue', rounds: { won: 9, lost: 13 }, won: false },
  ],
  kills: [],
  ...overrides,
});

describe('normalizeMatchesToCombat', () => {
  it('normaliza partida competitiva completa do jogador alvo', () => {
    const [combat] = normalizeMatchesToCombat([makeMatch()], { name: 'Player', tag: 'BR1' });

    expect(combat).toEqual({
      kills: 20,
      deaths: 10,
      assists: 5,
      roundsPlayed: 22, // 13 won + 9 lost
      headshots: 10,
      bodyshots: 20,
      legshots: 10,
      score: 4000,
      kast: undefined, // fonte não fornece — nunca inventamos
      firstBloods: 0, // timeline presente e sem FB do jogador
      firstDeaths: 0,
    });
  });

  it('localiza o jogador com Riot ID case-insensitive', () => {
    const [combat] = normalizeMatchesToCombat([makeMatch()], { name: 'player', tag: 'br1' });

    expect(combat?.kills).toBe(20);
  });

  it('calcula First Bloods/Deaths reais a partir da timeline de kills', () => {
    const match = makeMatch({
      kills: [
        makeKill(1, 1_000, 'puuid-player', 'puuid-enemy'), // FB do jogador (mais cedo do round 1)
        makeKill(1, 5_000, 'puuid-enemy', 'puuid-ally'),
        makeKill(2, 60_000, 'puuid-enemy', 'puuid-player'), // FD do jogador
        makeKill(3, 65_000, 'puuid-enemy', 'puuid-ally'), // mais cedo que o kill do jogador no round 3
        makeKill(3, 70_000, 'puuid-player', 'puuid-enemy'), // NÃO é FB (chegou depois)
      ],
    });

    const [combat] = normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' });

    expect(combat?.firstBloods).toBe(1);
    expect(combat?.firstDeaths).toBe(1);
  });

  it('omite FB/FD quando a partida não traz timeline de kills', () => {
    const match = makeMatch({ kills: undefined });
    const [combat] = normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' });

    expect(combat?.firstBloods).toBeUndefined();
    expect(combat?.firstDeaths).toBeUndefined();
  });

  it('pula partida quando o jogador não está nela (ex: troca de nick)', () => {
    const match = makeMatch({
      players: [makePlayer({ puuid: 'puuid-outro', name: 'Outro', tag: 'ZZ9' })],
    });

    expect(normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' })).toEqual([]);
  });

  it('pula partida de fila não-competitiva (mesmo que a API retorne)', () => {
    const match = makeMatch({
      metadata: { ...makeMatch().metadata, queue: { id: 'unrated' } },
    });

    expect(normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' })).toEqual([]);
  });

  it('pula partida incompleta (remake/em andamento)', () => {
    const match = makeMatch({ metadata: { ...makeMatch().metadata, is_completed: false } });

    expect(normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' })).toEqual([]);
  });

  it('pula partida sem times (impossível derivar rounds)', () => {
    const match = makeMatch({ teams: [] });

    expect(normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' })).toEqual([]);
  });

  it('pula partida com stats ausentes/inválidas do jogador', () => {
    const match = makeMatch({
      players: [makePlayer({ stats: undefined as unknown as HenrikDevPlayerV4['stats'] })],
    });

    expect(normalizeMatchesToCombat([match], { name: 'Player', tag: 'BR1' })).toEqual([]);
  });

  it('mistura partidas válidas e inválidas preservando apenas as válidas', () => {
    const result = normalizeMatchesToCombat(
      [
        makeMatch({ metadata: { ...makeMatch().metadata, match_id: 'valida-1' } }),
        makeMatch({ metadata: { ...makeMatch().metadata, queue: { id: 'deathmatch' } } }),
        makeMatch({ metadata: { ...makeMatch().metadata, match_id: 'valida-2' } }),
      ],
      { name: 'Player', tag: 'BR1' },
    );

    expect(result).toHaveLength(2);
  });
});
