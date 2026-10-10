import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiCallout } from '@/components/ai';

describe('AiCallout', () => {
  it('renderiza título, chips de risco/confiança e corpo', () => {
    const html = renderToStaticMarkup(
      <AiCallout
        title="PROTOCOL ADVICE: MAP POOL DEFICIT ENGINE"
        riskChip="RISCO ELEVADO DE RR (-48 RR/SEM)"
        confidence="94.6%"
      >
        <h4>Seu map pool está defasado</h4>
        <p>Ban de Ascent está custando RR.</p>
      </AiCallout>,
    );
    expect(html).toContain('data-component="ai-callout"');
    expect(html).toContain('RISCO ELEVADO DE RR (-48 RR/SEM)');
    expect(html).toContain('94.6%');
    expect(html).toContain('Ban de Ascent');
  });

  it('renderiza ações numeradas alternando acento/tinta', () => {
    const html = renderToStaticMarkup(
      <AiCallout
        title="X"
        actions={[
          { title: 'Fila só de Ascent', description: 'Próximas 10 partidas.' },
          { title: 'Review de VOD', description: '5 min por mapa.' },
        ]}
      >
        Y
      </AiCallout>,
    );
    expect(html).toContain('data-ai-actions');
    expect(html).toContain('01');
    expect(html).toContain('02');
    expect(html).toContain('Fila só de Ascent');
  });

  it('renderiza quick action com botões primário/ghost', () => {
    const html = renderToStaticMarkup(
      <AiCallout
        title="X"
        quickAction={{
          label: 'Ação rápida',
          title: 'Plano de 7 dias',
          description: 'Gerado pela IA.',
          primary: { label: 'Gerar plano', onSelect: () => {} },
          ghost: { label: 'Ver detalhes', onSelect: () => {} },
        }}
      >
        Y
      </AiCallout>,
    );
    expect(html).toContain('Gerar plano');
    expect(html).toContain('Ver detalhes');
    expect(html).toContain('bg-accent');
  });
});
