import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundEconomy } from '@/components/match';
import type { MatchDetail, MatchScoreboardRow, RoundEconomy as Eco } from '@/contracts/tracker';

const row = (puuid: string, name: string, teamId: string): MatchScoreboardRow => ({
  puuid,
  name,
  tag: 'VC1',
  teamId,
  agent: 'Sova',
  tier: null,
  kills: 0,
  deaths: 0,
  assists: 0,
  score: 0,
  acs: 0,
  hsPercentage: null,
  damageDealt: 0,
  damageReceived: 0,
  kastPercentage: null,
  economy: null,
  abilityCasts: null,
});

const eco = (roundNumber: number, puuid: string, teamId: string, loadoutValue: number): Eco => ({
  roundNumber,
  puuid,
  teamId,
  loadoutValue,
  weapon: loadoutValue > 3000 ? 'Vandal' : 'Classic',
  armor: loadoutValue > 3000 ? 'Heavy Shields' : null,
  spent: loadoutValue - 100,
  remaining: 1250,
});

const detail: MatchDetail = {
  matchId: 'm1',
  region: 'br',
  map: 'Ascent',
  queue: 'competitive',
  season: null,
  startedAt: '2026-10-01T12:00:00.000Z',
  gameLengthMs: 1,
  isCompleted: true,
  teams: [],
  scoreboard: [row('r1', 'Seiva', 'Red'), row('r2', 'Garoa', 'Red'), row('b1', 'Brasa', 'Blue')],
  rounds: [1, 2, 3, 25].map((n) => ({
    roundNumber: n,
    winningTeamId: 'Red',
    plantSite: null,
    plantTeamId: null,
    defused: false,
  })),
  kills: [],
  economy: [
    eco(1, 'r1', 'Red', 800),
    eco(1, 'r2', 'Red', 800),
    eco(1, 'b1', 'Blue', 800),
    eco(2, 'r1', 'Red', 900),
    eco(2, 'r2', 'Red', 1000),
    eco(3, 'r1', 'Red', 4700),
    eco(3, 'r2', 'Red', 4500),
    eco(25, 'r1', 'Red', 3000),
    eco(25, 'r2', 'Red', 3200),
  ],
};

describe('RoundEconomy', () => {
  it('uma linha por round com o tipo de compra do time', () => {
    const html = renderToStaticMarkup(<RoundEconomy detail={detail} teamId="Red" />);
    expect(html).toContain('data-component="round-economy"');
    expect(html).toContain('data-buy-type="pistol"');
    expect(html).toContain('data-buy-type="eco"');
    expect(html).toContain('data-buy-type="full"');
    expect(html).toContain('data-buy-type="force"');
    expect(html.split('data-buy-type=').length - 1).toBe(4);
  });

  it('mostra loadout, gasto e sobra por jogador do time', () => {
    const html = renderToStaticMarkup(<RoundEconomy detail={detail} teamId="Red" />);
    expect(html).toContain('Seiva');
    expect(html).toContain('Garoa');
    expect(html).not.toContain('Brasa');
    expect(html).toContain('4.700');
    expect(html).toContain('4.600');
    expect(html).toContain('1.250');
    expect(html).toContain('Vandal');
  });

  it('economia ausente → não renderiza nada', () => {
    expect(renderToStaticMarkup(<RoundEconomy detail={{ ...detail, economy: null }} teamId="Red" />)).toBe('');
    expect(renderToStaticMarkup(<RoundEconomy detail={{ ...detail, economy: undefined }} teamId="Red" />)).toBe('');
  });
});
