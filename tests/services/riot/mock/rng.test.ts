import { describe, expect, it } from 'vitest';
import { createRng, fnv1a, mockUuid, seedFromRiotId } from '@/services/riot/mock/rng';

describe('mock rng', () => {
  it('seedFromRiotId ignora caixa', () => {
    expect(seedFromRiotId('Next To Nothing', 'NOWAY')).toBe(seedFromRiotId('next to nothing', 'noway'));
    expect(seedFromRiotId('ValCoachDemo', 'DEMO')).not.toBe(seedFromRiotId('ValCoachDemo', 'DEMO2'));
  });

  it('fnv1a é o FNV-1a 32 bits clássico', () => {
    // Vetores de teste conhecidos do FNV-1a 32 bits.
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });

  it('createRng é determinístico e fica no intervalo', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 500; i += 1) {
      const x = a.next();
      expect(x).toBe(b.next());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    const r = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const v = r.int(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
    expect(['x', 'y']).toContain(r.pick(['x', 'y']));
    expect(() => r.pick([])).toThrow();
  });

  it('mockUuid gera UUID v4-like minúsculo', () => {
    const id = mockUuid(createRng(1));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(mockUuid(createRng(1))).toBe(id);
    expect(mockUuid(createRng(2))).not.toBe(id);
  });
});
