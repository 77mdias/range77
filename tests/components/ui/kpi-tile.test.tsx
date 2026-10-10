import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Badge } from '@/components/ui/badge';
import { KpiTile } from '@/components/ui/kpi-tile';

describe('KpiTile', () => {
  it('renderiza label, valor e estrutura do strip', () => {
    const html = renderToStaticMarkup(<KpiTile label="K/D" value="1.34" />);
    expect(html).toContain('data-component="kpi-tile"');
    expect(html).toContain('K/D');
    expect(html).toContain('1.34');
    expect(html).toContain('bg-surface-raised');
  });

  it('exibe acento na linha do label e trailing no valor', () => {
    const html = renderToStaticMarkup(
      <KpiTile
        label="WR"
        value="58%"
        accent="+4pp"
        trailing={<Badge variant="accent">122W 88L</Badge>}
      />,
    );
    expect(html).toContain('data-kpi-accent');
    expect(html).toContain('+4pp');
    expect(html).toContain('data-kpi-trailing');
    expect(html).toContain('122W 88L');
  });
});
