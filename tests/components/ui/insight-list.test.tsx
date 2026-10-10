import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InsightList } from '@/components/ui/insight-list';

const ITEMS = [
  { title: 'ENTRY AGRESSIVO', description: 'Taxa de primeiro sangue acima do elo.' },
  { title: 'CLUTCH FRACO', description: 'Conversão 1v2 abaixo da média.' },
];

describe('InsightList', () => {
  it('renderiza itens com tone=strength em verde', () => {
    const html = renderToStaticMarkup(
      <InsightList tone="strength" label="PONTOS FORTES COMPUTADOS" items={ITEMS} />,
    );
    expect(html).toContain('data-tone="strength"');
    expect(html).toContain('text-win');
    expect(html).toContain('ENTRY AGRESSIVO');
    expect(html).toContain('data-icon="check"');
  });

  it('renderiza itens com tone=weakness em vermelho e ícone de warning', () => {
    const html = renderToStaticMarkup(
      <InsightList
        tone="weakness"
        label="PONTOS CRÍTICOS IDENTIFICADOS"
        items={ITEMS.slice(1)}
      />,
    );
    expect(html).toContain('data-tone="weakness"');
    expect(html).toContain('text-loss');
    expect(html).toContain('data-icon="warning"');
  });
});
