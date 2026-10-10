import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchIngestionModal, type IngestionStep } from '@/components/home';

const STEPS: readonly IngestionStep[] = [
  { label: 'CAMADA 1: Handshake HenrikDev concluído', state: 'done' },
  { label: 'CAMADA 2: Pipeline Rust compilou 412KB de ticks', state: 'running' },
  { label: 'CAMADA 3: Minimax LLM gerando diagnóstico...', state: 'pending' },
];

describe('SearchIngestionModal', () => {
  it('não renderiza quando fechado', () => {
    const html = renderToStaticMarkup(
      <SearchIngestionModal open={false} target="NEXUS#BR1" steps={STEPS} progressPercent={0} onClose={() => {}} />,
    );
    expect(html).toBe('');
  });

  it('renderiza target, passos com estado e progresso', () => {
    const html = renderToStaticMarkup(
      <SearchIngestionModal open target="NEXUS#BR1" steps={STEPS} progressPercent={80} onClose={() => {}} />,
    );
    expect(html).toContain('data-component="search-ingestion-modal"');
    expect(html).toContain('NEXUS#BR1');
    expect(html).toContain('data-step-state="done"');
    expect(html).toContain('data-step-state="running"');
    expect(html).toContain('data-step-state="pending"');
    expect(html).toContain('80%');
    expect(html).toContain('width:80%');
  });

  it('CTA desabilitado até ready', () => {
    const locked = renderToStaticMarkup(
      <SearchIngestionModal open target="X" steps={STEPS} progressPercent={50} onClose={() => {}} />,
    );
    expect(locked).toContain('disabled');
    const unlocked = renderToStaticMarkup(
      <SearchIngestionModal open target="X" steps={STEPS} progressPercent={100} ready onClose={() => {}} />,
    );
    expect(unlocked).toContain('Abrir relatório do jogador');
  });
});
