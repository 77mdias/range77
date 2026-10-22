import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EconomyDisciplineCard } from '@/components/player';

describe('EconomyDisciplineCard', () => {
  it('mostra contagens absolutas e win% por tipo de compra (— sem amostra)', () => {
    const html = renderToStaticMarkup(
      <EconomyDisciplineCard
        discipline={{
          forcedWhileTeamSaved: 7,
          savedWhileTeamBought: 3,
          rounds: 120,
          winRateByBuy: { pistol: 0.5, eco: 0.125, force: null, full: 0.6 },
        }}
      />,
    );
    expect(html).toContain('data-component="economy-discipline"');
    expect(html).toMatch(/data-stat="forced"[^]*?>7</);
    expect(html).toMatch(/data-stat="saved"[^]*?>3</);
    expect(html).toContain('120 rounds');
    expect(html).toMatch(/data-buy="pistol"[^]*?50%/);
    expect(html).toMatch(/data-buy="eco"[^]*?13%/);
    expect(html).toMatch(/data-buy="force"[^]*?—/);
    expect(html).toMatch(/data-buy="full"[^]*?60%/);
  });
});
