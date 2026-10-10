import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusDot } from '@/components/ui/status-dot';

describe('StatusDot', () => {
  it('usa live (pulsante, acento) por padrão', () => {
    const html = renderToStaticMarkup(<StatusDot />);
    expect(html).toContain('data-variant="live"');
    expect(html).toContain('bg-accent');
    expect(html).toContain('animate-pulse');
  });

  it('renderiza quadrados marcadores (ink/accent)', () => {
    expect(renderToStaticMarkup(<StatusDot variant="square" />)).toContain('bg-text-primary');
    expect(renderToStaticMarkup(<StatusDot variant="square-accent" />)).toContain('bg-accent');
  });

  it('renderiza idle sem animação', () => {
    const html = renderToStaticMarkup(<StatusDot variant="idle" />);
    expect(html).not.toContain('animate-pulse');
    expect(html).toContain('bg-surface-hover');
  });
});
