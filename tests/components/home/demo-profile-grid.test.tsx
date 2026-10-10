import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DemoProfileGrid, type DemoProfile } from '@/components/home';

const PROFILES: readonly DemoProfile[] = [
  { riotId: 'NEXUS#BR1', regionChip: 'BR', rank: 'Ascendant 3', rr: '78 RR', highlighted: true },
  { riotId: 'ASPAS#LEV', regionChip: 'LATAM', rank: 'Radiant', rr: '840 RR' },
];

describe('DemoProfileGrid', () => {
  it('renderiza perfis com nome, chip de região, rank e RR', () => {
    const html = renderToStaticMarkup(<DemoProfileGrid profiles={PROFILES} />);
    expect(html).toContain('data-component="demo-profile-grid"');
    expect(html).toContain('NEXUS#BR1');
    expect(html).toContain('LATAM');
    expect(html).toContain('Radiant');
    expect(html).toContain('840 RR');
  });

  it('perfil destacado usa acento', () => {
    const html = renderToStaticMarkup(<DemoProfileGrid profiles={PROFILES} />);
    expect(html).toContain('data-highlighted=""');
    expect(html).toContain('bg-accent');
  });

  it('cards viram botões quando onSelect presente', () => {
    const html = renderToStaticMarkup(
      <DemoProfileGrid profiles={PROFILES} onSelect={() => {}} />,
    );
    expect(html.match(/<button/g)?.length).toBe(2);
  });
});
