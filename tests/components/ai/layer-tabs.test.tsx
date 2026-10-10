import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LayerTabs } from '@/components/ai';

const OPTIONS = [
  { id: 'raw', label: 'Raw' },
  { id: 'normalized', label: 'Normalizado' },
  { id: 'prompt', label: 'Prompt L3' },
];

describe('LayerTabs', () => {
  it('renderiza tablist segmentado com ativa em acento', () => {
    const html = renderToStaticMarkup(
      <LayerTabs options={OPTIONS} activeId="prompt" onChange={() => {}} />,
    );
    expect(html).toContain('data-component="layer-tabs"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('bg-accent');
    expect(html).toContain('Prompt L3');
  });
});
