import { describe, expect, it } from 'vitest';
import {
  CREDIT_CAP,
  buyLoadout,
  buyTypeForCredits,
  lossBonus,
} from '@/services/riot/mock/economy';
import { createRng } from '@/services/riot/mock/rng';

describe('mock economy', () => {
  it('buy type pelos créditos médios do time', () => {
    expect(buyTypeForCredits(1500)).toBe('eco');
    expect(buyTypeForCredits(2000)).toBe('eco');
    expect(buyTypeForCredits(2001)).toBe('force');
    expect(buyTypeForCredits(3900)).toBe('force');
    expect(buyTypeForCredits(3901)).toBe('full');
  });

  it('bônus de derrota 1900/2400/2900', () => {
    expect(lossBonus(1)).toBe(1900);
    expect(lossBonus(2)).toBe(2400);
    expect(lossBonus(3)).toBe(2900);
    expect(lossBonus(7)).toBe(2900);
  });

  it('economia plausível em qualquer compra', () => {
    const rng = createRng(99);
    for (let i = 0; i < 3000; i += 1) {
      const credits = rng.int(0, CREDIT_CAP);
      const type = rng.pick(['pistol', 'eco', 'force', 'full'] as const);
      const kept = rng.next() < 0.3 ? { weapon: 'ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a', armor: '' } : null;
      const buy = buyLoadout(type === 'pistol' ? 800 : credits, type, type === 'pistol' ? null : kept, rng, rng.next() < 0.2);
      const total = type === 'pistol' ? 800 : credits;
      expect(buy.spent).toBeGreaterThanOrEqual(0);
      expect(buy.spent).toBeLessThanOrEqual(total);
      expect(buy.spent).toBeLessThanOrEqual(9000);
      expect(buy.weapon).not.toBe('');
      if (type === 'pistol') expect(buy.loadoutValue).toBeLessThanOrEqual(800);
    }
  });
});
