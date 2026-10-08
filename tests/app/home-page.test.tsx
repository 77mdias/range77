import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from '@/app/page';

/**
 * SUITE TDD — home provisória (fase 1a): hero display, barra de busca
 * PLACEHOLDER (wiring real na fase 2) e faixa de features. O contrato da
 * busca fixa as 6 regiões do tracker — a fase 2 o torna funcional.
 */

const REGIONS = ['eu', 'na', 'ap', 'kr', 'latam', 'br'] as const;

const html = () => renderToStaticMarkup(<HomePage />);

describe('HomePage (provisória)', () => {
  it('renderiza o hero com título display', () => {
    const output = html();
    expect(output).toContain('<h1');
    expect(output).toContain('ANALISE');
  });

  it('renderiza a barra de busca placeholder com todas as regiões do tracker', () => {
    const output = html();
    for (const region of REGIONS) {
      expect(output).toContain(`<option value="${region}"`);
    }
  });

  it('busca placeholder: input para Riot ID (nome#tag) e botão Buscar', () => {
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
