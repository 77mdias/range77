import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundSelector } from '@/components/match';

const ROUNDS = [
  { id: 'r3', label: 'Round 3' },
  { id: 'r4', label: 'Round 4 • Clutch 1v2' },
];

describe('RoundSelector', () => {
  it('marca o round ativo com aria-selected', () => {
    const html = renderToStaticMarkup(
      <RoundSelector rounds={ROUNDS} activeId="r4" onSelect={() => {}} />,
    );
    expect(html).toContain('data-component="round-selector"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('Round 4 • Clutch 1v2');
  });

  it('ativa usa tinta e inativa superfície', () => {
    const html = renderToStaticMarkup(
      <RoundSelector rounds={ROUNDS} activeId="r3" onSelect={() => {}} />,
    );
    expect(html).toContain('bg-text-primary');
    expect(html).toContain('bg-surface');
  });
});
