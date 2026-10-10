import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PipelineStepCard } from '@/components/ai';

describe('PipelineStepCard', () => {
  it('fase comum usa chip com borda e caixa neutra', () => {
    const html = renderToStaticMarkup(
      <PipelineStepCard
        phase="FASE 01"
        metric="~420 KB"
        icon="download"
        title="Ingestão HenrikDev API"
        description="Extração completa de ticks oficiais da Riot Games."
        output="raw_match_timeline.json"
      />,
    );
    expect(html).toContain('data-component="pipeline-step-card"');
    expect(html).toContain('FASE 01');
    expect(html).toContain('~420 KB');
    expect(html).toContain('raw_match_timeline.json');
    expect(html).toContain('border-line bg-surface-raised');
  });

  it('fase núcleo ganha chip e caixa em acento', () => {
    const html = renderToStaticMarkup(
      <PipelineStepCard
        phase="FASE 02 • NÚCLEO"
        highlighted
        metric="~85 KB"
        icon="refresh"
        title="Motor de KPIs"
        description="Computação algorítmica."
        output="kpi_compressed_matrix.bin"
      />,
    );
    expect(html).toContain('bg-accent');
  });

  it('renderiza rodapé SAÍDA com o arquivo', () => {
    const html = renderToStaticMarkup(
      <PipelineStepCard
        phase="FASE 03"
        metric="420 tokens"
        icon="bot"
        title="Síntese cognitiva"
        description="LLM recebe apenas vetores."
        output="actionable_coach_diagnosis.md"
      />,
    );
    expect(html).toContain('Saída:');
    expect(html).toContain('actionable_coach_diagnosis.md');
  });
});
