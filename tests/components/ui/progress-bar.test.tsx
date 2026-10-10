import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressBar } from '@/components/ui/progress-bar';

describe('ProgressBar', () => {
  it('renderiza o fill com a largura informada', () => {
    const html = renderToStaticMarkup(<ProgressBar value={42} />);
    expect(html).toContain('width:42%');
    expect(html).toContain('role="meter"');
    expect(html).toContain('aria-valuenow="42"');
  });

  it('limita valores fora de 0–100', () => {
    expect(renderToStaticMarkup(<ProgressBar value={150} />)).toContain('width:100%');
    expect(renderToStaticMarkup(<ProgressBar value={-10} />)).toContain('width:0%');
  });

  it('aplica os tons e o marcador de benchmark', () => {
    expect(renderToStaticMarkup(<ProgressBar value={50} tone="loss" />)).toContain('bg-loss');
    const withMarker = renderToStaticMarkup(<ProgressBar value={60} markerPercent={52.5} />);
    expect(withMarker).toContain('data-testid="progress-marker"');
    expect(withMarker).toContain('left:52.5%');
  });
});
