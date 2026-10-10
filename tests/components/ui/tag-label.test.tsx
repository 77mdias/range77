import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TagLabel } from '@/components/ui/tag-label';

describe('TagLabel', () => {
  it('renderiza com o prefixo // e tom secundário por padrão', () => {
    const html = renderToStaticMarkup(<TagLabel>AGENT_TELEMETRY_PIPELINE</TagLabel>);
    expect(html).toContain('//');
    expect(html).toContain('data-tone="secondary"');
    expect(html).toContain('uppercase');
  });

  it('omite o prefixo quando withPrefix=false e aplica tons', () => {
    expect(renderToStaticMarkup(<TagLabel withPrefix={false}>X</TagLabel>)).not.toContain('//');
    expect(renderToStaticMarkup(<TagLabel tone="critical">X</TagLabel>)).toContain('text-loss');
    expect(renderToStaticMarkup(<TagLabel tone="positive">X</TagLabel>)).toContain('text-win');
  });
});
