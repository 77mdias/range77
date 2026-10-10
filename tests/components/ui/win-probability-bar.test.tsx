import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WinProbabilityBar } from '@/components/ui/win-probability-bar';

describe('WinProbabilityBar', () => {
  it('renderiza camadas pré/pós com labels e valores', () => {
    const html = renderToStaticMarkup(
      <WinProbabilityBar beforePercent={64} afterPercent={18} />,
    );
    expect(html).toContain('data-testid="probability-before"');
    expect(html).toContain('data-testid="probability-after"');
    expect(html).toContain('width:64%');
    expect(html).toContain('width:18%');
  });

  it('sinaliza queda em vermelho e ganho em verde', () => {
    expect(
      renderToStaticMarkup(<WinProbabilityBar beforePercent={64} afterPercent={18} />),
    ).toContain('text-loss');
    expect(
      renderToStaticMarkup(<WinProbabilityBar beforePercent={18} afterPercent={64} />),
    ).toContain('text-win');
  });

  it('aceita labels customizados', () => {
    const html = renderToStaticMarkup(
      <WinProbabilityBar beforePercent={50} afterPercent={50} beforeLabel="Antes" afterLabel="Depois" />,
    );
    expect(html).toContain('Antes');
    expect(html).toContain('Depois');
  });
});
