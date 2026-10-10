import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundDiagnosis } from '@/components/match';

describe('RoundDiagnosis', () => {
  it('veredito sub-ótimo usa chip vermelho e barra com queda', () => {
    const html = renderToStaticMarkup(
      <RoundDiagnosis
        meta="TELEMETRIA DO LANCE: 00:18 RESTANTES"
        verdict="suboptimal"
        verdictLabel="Decisão sub-ótima"
        beforePercent={64}
        afterPercent={18}
        analysis="Push solo no catwalk sem util."
      />,
    );
    expect(html).toContain('data-verdict="suboptimal"');
    expect(html).toContain('bg-loss');
    expect(html).toContain('64%');
    expect(html).toContain('18%');
    expect(html).toContain('Push solo no catwalk sem util.');
  });

  it('veredito excelente usa chip em acento', () => {
    const html = renderToStaticMarkup(
      <RoundDiagnosis
        meta="RETAKE B"
        verdict="excellent"
        verdictLabel="Execução excelente"
        beforePercent={22}
        afterPercent={71}
        analysis="Trade perfeito com a dupla."
      />,
    );
    expect(html).toContain('data-verdict="excellent"');
    expect(html).toContain('bg-accent');
  });

  it('renderiza slot adicional (children)', () => {
    const html = renderToStaticMarkup(
      <RoundDiagnosis
        meta="X"
        verdict="excellent"
        verdictLabel="Ok"
        beforePercent={50}
        afterPercent={60}
        analysis="Y"
      >
        <p data-slot-child>extra</p>
      </RoundDiagnosis>,
    );
    expect(html).toContain('data-slot-child');
  });
});
