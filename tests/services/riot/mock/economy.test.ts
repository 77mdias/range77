import { describe, expect, it } from 'vitest';
import {
  ARMORS,
  CREDIT_CAP,
  WEAPONS,
  buyLoadout,
  buyTypeForCredits,
  lossBonus,
} from '@/services/riot/mock/economy';
import { generateAccount, generateMatchlist } from '@/services/riot/mock/generate-account';
import { generateMatch } from '@/services/riot/mock/generate-match';
import { createRng } from '@/services/riot/mock/rng';

// Guardian não está no catálogo do mock; id de conteúdo (valorant-api.com/v1/weapons).
const GUARDIAN = '4ade7faa-4cf1-8376-95ef-39884480959b';

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

  it('economia plausível em qualquer compra', { timeout: 20_000 }, () => {
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

  it('perdedor do pistol não compra rifle + heavy no round 2', { timeout: 20_000 }, () => {
    const rifles = new Set<string>([WEAPONS.vandal.id, WEAPONS.phantom.id, WEAPONS.bulldog.id, GUARDIAN]);
    const acc = generateAccount('ValCoachDemo', 'DEMO');
    for (const h of generateMatchlist(acc, 200).history) {
      const m = generateMatch(h.matchId, acc);
      for (const pistol of [0, 12]) {
        const r0 = m.roundResults.find((r) => r.roundNum === pistol)!;
        const r1 = m.roundResults.find((r) => r.roundNum === pistol + 1);
        if (!r1) continue;
        const losers = r1.playerStats.filter(
          (s) => m.players.find((p) => p.puuid === s.puuid)!.teamId !== r0.winningTeam,
        );
        for (const s of losers) {
          const e = s.economy!;
          expect(e.loadoutValue).toBeLessThanOrEqual(e.spent + e.remaining);
          expect(rifles.has(e.weapon) && e.armor === ARMORS.heavy.id).toBe(false);
        }
        // Padrão real: quem perde o pistol economiza (eco) no round seguinte.
        const avg = losers.reduce((sum, s) => sum + s.economy!.loadoutValue, 0) / losers.length;
        expect(avg).toBeLessThan(2000);
      }
    }
  });
});
