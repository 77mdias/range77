import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeaponCard } from '@/components/match';

describe('WeaponCard', () => {
  it('arma primária ganha chip em acento', () => {
    const html = renderToStaticMarkup(
      <WeaponCard
        name="Vandal"
        kills={18}
        primary
        meter={{ value: 39.2, label: 'HS 39.2%' }}
        stats={[
          { label: 'Dano/round', value: '142' },
          { label: 'Precisão', value: '31%' },
        ]}
      />,
    );
    expect(html).toContain('data-component="weapon-card"');
    expect(html).toContain('Vandal');
    expect(html).toContain('18 abates');
    expect(html).toContain('bg-accent');
    expect(html).toContain('HS 39.2%');
  });

  it('arma secundária usa chip neutro', () => {
    const html = renderToStaticMarkup(
      <WeaponCard
        name="Ghost"
        kills={3}
        primary={false}
        meter={{ value: 12, label: 'HS 12%' }}
        stats={[{ label: 'Dano/round', value: '61' }]}
      />,
    );
    expect(html).toContain('bg-surface-hover');
  });

  it('arma sem HS% omite o medidor (dado ausente)', () => {
    const html = renderToStaticMarkup(
      <WeaponCard
        name="Operator"
        kills={4}
        stats={[{ label: 'Share de abates', value: '20%' }]}
      />,
    );
    expect(html).toContain('Operator');
    expect(html).toContain('4 abates');
    expect(html).not.toContain('HS ');
  });
});
