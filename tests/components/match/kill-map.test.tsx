import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KillMap } from '@/components/match';
import type { KillEvent, MatchDetail, MatchScoreboardRow } from '@/contracts/tracker';

const row = (puuid: string, name: string, teamId: string): MatchScoreboardRow => ({
  puuid,
  name,
  tag: 'VC1',
  teamId,
  agent: 'Jett',
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

const kill = (
  roundNumber: number,
  killerPuuid: string,
  victimPuuid: string,
  timeInRoundMs: number,
): KillEvent => ({
  roundNumber,
  timeInMatchMs: timeInRoundMs,
  timeInRoundMs,
  killerPuuid,
  killerName: killerPuuid.toUpperCase(),
  victimPuuid,
  victimName: victimPuuid.toUpperCase(),
  assistantNames: [],
  assistantPuuids: [],
  weapon: 'Vandal',
  victimLocation: { x: 1000, y: -2000 },
  killerLocation: { x: 1500, y: -2500 },
  playerLocations: [
    { puuid: killerPuuid, location: { x: 1500, y: -2500 }, viewRadians: 0 },
    { puuid: 'b2', location: { x: 3000, y: -4000 }, viewRadians: 1 },
  ],
});

const detail: MatchDetail = {
  matchId: 'm1',
  region: 'br',
  map: 'Ascent',
  mapId: '/Game/Maps/Ascent/Ascent',
  queue: 'competitive',
  season: null,
  startedAt: '2026-10-01T12:00:00.000Z',
  gameLengthMs: 1,
  isCompleted: true,
  teams: [],
  scoreboard: [row('r1', 'Seiva', 'Red'), row('r2', 'Garoa', 'Red'), row('b1', 'Brasa', 'Blue'), row('b2', 'Granizo', 'Blue')],
  rounds: [
    {
      roundNumber: 1,
      winningTeamId: 'Red',
      plantSite: 'A',
      plantTeamId: 'Red',
      defused: false,
      plant: { playerPuuid: 'r1', location: { x: 2000, y: -3000 }, timeInRoundMs: 40_000, site: 'A' },
      defuse: null,
    },
    {
      roundNumber: 2,
      winningTeamId: 'Blue',
      plantSite: 'B',
      plantTeamId: 'Red',
      defused: true,
      plant: { playerPuuid: 'r2', location: { x: 2000, y: -3000 }, timeInRoundMs: 40_000, site: 'B' },
      defuse: { playerPuuid: 'b1', location: { x: 2010, y: -3010 }, timeInRoundMs: 80_000, site: 'B' },
    },
    { roundNumber: 25, winningTeamId: 'Blue', plantSite: null, plantTeamId: null, defused: false },
  ],
  kills: [
    kill(1, 'r1', 'b1', 8_000),
    kill(1, 'b2', 'r2', 15_000),
    kill(1, 'r1', 'b2', 62_500),
    kill(2, 'b1', 'r1', 5_000),
    kill(25, 'b2', 'r1', 12_000),
  ],
};

const countOf = (html: string, needle: string): number => html.split(needle).length - 1;

describe('KillMap', () => {
  it('desenha um marcador data-kill por abate do round, sobre o minimapa', () => {
    const html = renderToStaticMarkup(<KillMap detail={detail} roundNumber={1} />);
    expect(html).toContain('data-component="kill-map"');
    expect(html).toContain('/assets/images/minimaps/ascent.png');
    expect(countOf(html, 'data-kill=')).toBe(3);
  });

  it('marca plant e defuse com data-spike', () => {
    const r1 = renderToStaticMarkup(<KillMap detail={detail} roundNumber={1} />);
    expect(r1).toContain('data-spike="plant"');
    expect(r1).not.toContain('data-spike="defuse"');
    const r2 = renderToStaticMarkup(<KillMap detail={detail} roundNumber={2} />);
    expect(r2).toContain('data-spike="plant"');
    expect(r2).toContain('data-spike="defuse"');
  });

  it('renderiza round de prorrogação (25)', () => {
    const html = renderToStaticMarkup(<KillMap detail={detail} roundNumber={25} />);
    expect(countOf(html, 'data-kill=')).toBe(1);
    expect(html).toContain('Round 25');
  });

  it('<title> de cada marcador é um único texto (sem nós separados) com posições de todos', () => {
    const html = renderToStaticMarkup(<KillMap detail={detail} roundNumber={1} />);
    const titles = [...html.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1] ?? '');
    expect(titles.length).toBeGreaterThanOrEqual(4);
    for (const title of titles) {
      expect(title).not.toContain('<!--');
      expect(title.length).toBeGreaterThan(0);
    }
    expect(titles[0]).toContain('R1 → B1');
    expect(titles[0]).toContain('Granizo (3000, -4000)');
  });

  it('destaca abates/mortes do jogador em foco', () => {
    const html = renderToStaticMarkup(<KillMap detail={detail} roundNumber={1} focusPuuid="r1" />);
    expect(countOf(html, 'data-focus="true"')).toBe(2);
  });

  it('sem minimapa conhecido não renderiza nada', () => {
    const html = renderToStaticMarkup(
      <KillMap detail={{ ...detail, map: 'Inexistente', mapId: null }} roundNumber={1} />,
    );
    expect(html).toBe('');
  });
});
