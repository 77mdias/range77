import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoachingTip } from '@/components/ui/coaching-tip';

describe('CoachingTip', () => {
  it('renderiza título com prefixo //, corpo e borda acento', () => {
    const html = renderToStaticMarkup(
      <CoachingTip title="Protocol advice">Jogue mais retakes no Ascent.</CoachingTip>,
    );
    expect(html).toContain('data-component="coaching-tip"');
    expect(html).toContain('border-l-accent');
    expect(html).toContain('Protocol advice');
    expect(html).toContain('Jogue mais retakes no Ascent.');
  });

  it('exibe chip de prioridade e rodapé de impacto', () => {
    const html = renderToStaticMarkup(
      <CoachingTip title="X" priority="critica" impact="Impacto estimado: +12% WR">
        Y
      </CoachingTip>,
    );
    expect(html).toContain('Crítico');
    expect(html).toContain('Impacto estimado: +12% WR');
  });
});
