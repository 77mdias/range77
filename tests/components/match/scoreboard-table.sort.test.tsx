// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ScoreboardTable, type ScoreboardTeam } from '@/components/match';

/**
 * SUITE TDD — ordenação por clique nas colunas de stats da tabela telemétrica:
 * 1º clique melhores→piores, 2º piores→melhores, 3º automático; outra coluna
 * reinicia o ciclo.
 */

afterEach(cleanup);

const TEAM: ScoreboardTeam = {
  name: 'Time A',
  players: [
    {
      name: 'Charlie',
      agent: 'Omen',
      acs: 200,
      kills: 10,
      deaths: 20,
      assists: 5,
      kdDiff: -10,
      adr: 120,
      hsPercentage: 15,
      kastPercentage: 60,
      firstBloods: 1,
      firstDeaths: 3,
      econRating: 60,
    },
    {
      name: 'Alpha',
      agent: 'Jett',
      acs: 300,
      kills: 24,
      deaths: 12,
      assists: 6,
      kdDiff: 12,
      adr: 180,
      hsPercentage: 30,
      kastPercentage: 75,
      firstBloods: 5,
      firstDeaths: 2,
      econRating: 80,
    },
    {
      name: 'Bravo',
      agent: 'Sova',
      acs: 250,
      kills: 15,
      deaths: 15,
      assists: 8,
      kdDiff: 0,
      adr: 150,
      hsPercentage: 22,
      kastPercentage: 68,
      firstBloods: 3,
      firstDeaths: 3,
      econRating: 70,
    },
  ],
};

const order = (): (string | null)[] =>
  Array.from(document.querySelectorAll('[data-scoreboard-player]')).map((el) =>
    el.getAttribute('data-scoreboard-player'),
  );

const ariaSort = (label: string): string | null =>
  screen.getByRole('button', { name: `Ordenar por ${label}` }).closest('th')?.getAttribute('aria-sort') ??
  null;

describe('ScoreboardTable — ordenação por clique', () => {
  it('cicla melhores → piores → melhores → automático na mesma coluna', () => {
    render(<ScoreboardTable teams={[TEAM]} />);
    // Ordem automática = ordem de entrada.
    expect(order()).toEqual(['Charlie', 'Alpha', 'Bravo']);
    expect(ariaSort('ACS')).toBe('none');

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por ACS' }));
    expect(order()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(ariaSort('ACS')).toBe('descending');

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por ACS' }));
    expect(order()).toEqual(['Charlie', 'Bravo', 'Alpha']);
    expect(ariaSort('ACS')).toBe('ascending');

    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por ACS' }));
    expect(order()).toEqual(['Charlie', 'Alpha', 'Bravo']);
    expect(ariaSort('ACS')).toBe('none');
  });

  it('clicar em outra coluna reinicia em melhores → piores', () => {
    render(<ScoreboardTable teams={[TEAM]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por ACS' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por ADR' }));

    expect(order()).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(ariaSort('ADR')).toBe('descending');
    expect(ariaSort('ACS')).toBe('none');
  });
});
