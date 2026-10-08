import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — home (fase 2): hero display, busca FUNCIONAL (SearchBar +
 * navegação) com as 6 regiões do tracker e faixa de features.
 */

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

import HomePage from '@/app/page';

const REGIONS = ['eu', 'na', 'ap', 'kr', 'latam', 'br'] as const;

const html = () => renderToStaticMarkup(<HomePage />);

describe('HomePage (fase 2)', () => {
  it('renderiza o hero com título display', () => {
    const output = html();
    expect(output).toContain('<h1');
    expect(output).toContain('ANALISE');
  });

  it('renderiza a barra de busca com todas as regiões do tracker', () => {
    const output = html();
    for (const region of REGIONS) {
      expect(output).toContain(`<option value="${region}"`);
    }
  });

  it('busca: input para Riot ID (nome#tag) e botão Buscar', () => {
    const output = html();
    expect(output).toContain('placeholder="Nome#Tag"');
    expect(output).toContain('Buscar');
  });

  it('renderiza a faixa de features (combate, evolução, coaching)', () => {
    const output = html();
    expect(output).toContain('Análise de Combate');
    expect(output).toContain('Evolução Temporal');
    expect(output).toContain('Hooks de Coaching');
  });
});
