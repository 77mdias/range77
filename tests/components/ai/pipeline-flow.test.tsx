import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PipelineFlow } from '@/components/ai';

const STAGES = [
  { label: 'Camada 01: Raw HenrikDev', sizeChip: '420 KB', title: 'Payload bruto da API', meta: '27 endpoints' },
  { label: 'Camada 02: Normalização', sizeChip: '48 KB', title: 'Telemetria validada', meta: 'Zod + drift' },
  { label: 'Camada 03: Coaching', sizeChip: '1.8 KB / 420 TOKENS', title: 'Prompt sintetizado', meta: 'Economia de 91%', highlighted: true },
] as const;

describe('PipelineFlow', () => {
  it('renderiza estágios com chips e metas', () => {
    const html = renderToStaticMarkup(<PipelineFlow stages={STAGES} />);
    expect(html).toContain('data-component="pipeline-flow"');
    expect(html).toContain('Camada 01: Raw HenrikDev');
    expect(html).toContain('420 KB');
    expect(html).toContain('Economia de 91%');
  });

  it('camada destacada usa chip em acento', () => {
    const html = renderToStaticMarkup(<PipelineFlow stages={STAGES} />);
    expect(html).toContain('bg-accent');
    expect(html).toContain('text-win');
  });

  it('estágios além do primeiro recebem seta (md)', () => {
    const html = renderToStaticMarkup(<PipelineFlow stages={STAGES} />);
    expect(html).toContain('data-pipeline-stage="3"');
    // duas setas para 3 estágios
    expect(html.match(/data-icon="arrow-right"/g)?.length ?? 0).toBe(2);
  });
});
