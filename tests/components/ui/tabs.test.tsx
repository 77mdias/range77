// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getNextTabIndex, Tabs, type TabItem } from '@/components/ui/tabs';

/**
 * SUITE TDD — Tabs: acessibilidade (ARIA), troca de painel, navegação por
 * teclado (roving tabindex) e preservação de painel via <Activity>.
 */

afterEach(cleanup);

const ITEMS: readonly TabItem[] = [
  { id: 'overview', label: 'Visão geral', content: <p>painel-overview</p> },
  { id: 'matches', label: 'Partidas', content: <p>painel-matches</p> },
  { id: 'agents', label: 'Agentes', content: <p>painel-agents</p> },
];

describe('getNextTabIndex', () => {
  it('circula com ArrowRight/ArrowLeft', () => {
    expect(getNextTabIndex(0, 3, 'ArrowRight')).toBe(1);
    expect(getNextTabIndex(2, 3, 'ArrowRight')).toBe(0);
    expect(getNextTabIndex(0, 3, 'ArrowLeft')).toBe(2);
    expect(getNextTabIndex(1, 3, 'ArrowLeft')).toBe(0);
  });

  it('Home/End vão aos extremos', () => {
    expect(getNextTabIndex(2, 3, 'Home')).toBe(0);
    expect(getNextTabIndex(0, 3, 'End')).toBe(2);
  });

  it('retorna null para teclas não suportadas ou contagem inválida', () => {
    expect(getNextTabIndex(0, 3, 'Enter')).toBeNull();
    expect(getNextTabIndex(0, 0, 'ArrowRight')).toBeNull();
    expect(getNextTabIndex(-1, 3, 'ArrowRight')).toBeNull();
  });
});

describe('Tabs', () => {
  it('renderiza tablist e a primeira aba selecionada (roving tabindex)', () => {
    render(<Tabs ariaLabel="Abas" items={ITEMS} />);
    expect(screen.getByRole('tablist').getAttribute('aria-label')).toBe('Abas');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]?.getAttribute('tabindex')).toBe('0');
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('false');
    expect(tabs[1]?.getAttribute('tabindex')).toBe('-1');
  });

  it('troca de painel ao clicar numa aba', () => {
    render(<Tabs items={ITEMS} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Partidas' }));

    expect(screen.getByRole('tab', { name: 'Partidas' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    const activePanel = screen.getByText('painel-matches').closest('[role="tabpanel"]');
    const hiddenPanel = screen.getByText('painel-overview').closest('[role="tabpanel"]');
    expect((activePanel as HTMLElement).style.display).not.toBe('none');
    expect((hiddenPanel as HTMLElement).style.display).toBe('none');
  });

  it('preserva o conteúdo do painel inativo no DOM (Activity)', () => {
    render(<Tabs items={ITEMS} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Agentes' }));
    // O painel inicial continua montado (apenas oculto).
    expect(screen.getByText('painel-overview')).toBeTruthy();
  });

  it('navega por setas e Home/End movendo o foco', () => {
    render(<Tabs items={ITEMS} />);
    const tablist = screen.getByRole('tablist');

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Partidas' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Partidas' }));

    fireEvent.keyDown(tablist, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Agentes' }).getAttribute('aria-selected')).toBe(
      'true',
    );

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Visão geral' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('respeita defaultTabId quando presente', () => {
    render(<Tabs items={ITEMS} defaultTabId="agents" ariaLabel="Abas" />);
    expect(screen.getByRole('tab', { name: 'Agentes' }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });
});
