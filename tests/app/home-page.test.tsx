import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — home (tela Stitch "Busca de Jogador & Apresentação do
 * Ecossistema"): faixa de status, hero com busca FUNCIONAL (SearchBar +
 * modal de ingestão + navegação), arquitetura 3-layer, módulos e strip de
 * status ao vivo.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HomePage from '@/app/page';

const REGIONS = ['eu', 'na', 'ap', 'kr', 'latam', 'br'] as const;

const html = () => renderToStaticMarkup(<HomePage />);

describe('HomePage', () => {
  it('renderiza a faixa de status tática no topo', () => {
    const output = html();
    expect(output).toContain('data-component="system-status-bar"');
    expect(output).toContain('Motor tático v4.2');
    expect(output).toContain('Riot v9.11 compliant');
  });

  it('renderiza o hero com o título display', () => {
    const output = html();
    expect(output).toContain('<h1');
    expect(output).toContain('Análise telemétrica profissional e coaching de IA para Valorant');
  });

  it('renderiza o console de busca com todas as regiões do tracker', () => {
    const output = html();
    expect(output).toContain('data-component="search-console"');
    for (const region of REGIONS) {
      expect(output).toContain(`<option value="${region}"`);
    }
  });

  it('busca: input para Riot ID (nome#tag) e botão Buscar', () => {
    const output = html();
    expect(output).toContain('placeholder="Nome#Tag"');
    expect(output).toContain('Buscar');
  });

  it('renderiza o perfil demo catalogado apontando para um jogador real', () => {
    const output = html();
    expect(output).toContain('data-component="demo-profile-grid"');
    expect(output).toContain('twmz#tower');
    expect(output).not.toContain('NEXUS#BR1');
  });

  it('o modal de ingestão só aparece quando aberto', () => {
    const output = html();
    expect(output).not.toContain('data-component="search-ingestion-modal"');
  });

  it('renderiza a arquitetura de 3 camadas com as fases', () => {
    const output = html();
    expect(output).toContain('Arquitetura de 3 camadas');
    expect(output).toContain('FASE 01');
    expect(output).toContain('FASE 02 • NÚCLEO');
    expect(output).toContain('raw_match_timeline.json');
    expect(output).toContain('actionable_coach_diagnosis.md');
  });

  it('renderiza os 4 módulos do ecossistema', () => {
    const output = html();
    for (const title of [
      'Histórico telemétrico compacto',
      'Benchmark por elo real',
      'Map pool deficit engine',
      'Sandbox de IA interativo',
    ]) {
      expect(output).toContain(title);
    }
  });

  it('renderiza o strip de status ao vivo com o CTA demo', () => {
    const output = html();
    expect(output).toContain('data-component="live-status-strip"');
    expect(output).toContain('42.890+');
    expect(output).toContain('Testar perfil demo');
  });
});
