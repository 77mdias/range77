import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KpiMetric } from '@/components/ui/kpi-metric';

describe('KpiMetric', () => {
  it('renderiza label, valor e sufixo', () => {
    const html = renderToStaticMarkup(<KpiMetric label="Payload economizado" value="91" suffix="%" />);
    expect(html).toContain('data-component="kpi-metric"');
    expect(html).toContain('Payload economizado');
    expect(html).toContain('91');
    expect(html).toContain('%');
  });

  it('renderiza coluna lateral com divisor quando aside presente', () => {
    const html = renderToStaticMarkup(
      <KpiMetric label="Latência" value="180" suffix="ms" aside={<span>p95</span>} />,
    );
    expect(html).toContain('data-kpi-aside');
    expect(html).toContain('w-px');
    expect(html).toContain('p95');
  });

  it('não renderiza aside quando ausente', () => {
    const html = renderToStaticMarkup(<KpiMetric label="Latência" value="180" />);
    expect(html).not.toContain('data-kpi-aside');
  });
});
