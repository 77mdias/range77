/**
 * Aleatoriedade DETERMINÍSTICA do mock Riot: mesma semente → mesma
 * sequência, em qualquer processo/máquina. Nada aqui lê relógio ou
 * `Math.random`.
 */

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const encoder = new TextEncoder();

/** FNV-1a 32 bits sobre os bytes UTF-8 da string. */
export function fnv1a(input: string): number {
  let hash = FNV_OFFSET;
  for (const byte of encoder.encode(input)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/** Semente de uma conta: FNV-1a sobre `${name}#${tag}` em minúsculas. */
export function seedFromRiotId(name: string, tag: string): number {
  return fnv1a(`${name}#${tag}`.toLowerCase());
}

export interface Rng {
  /** Float em [0, 1). */
  next(): number;
  /** Inteiro em [min, max] (inclusivo). */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

/** Gerador mulberry32. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('rng.pick: lista vazia');
      return items[Math.floor(next() * items.length)] as T;
    },
  };
}

/** Semente derivada de várias partes (atalho para `fnv1a(partes.join(':'))`). */
export function seedOf(...parts: readonly (string | number)[]): number {
  return fnv1a(parts.join(':'));
}

/** UUID v4-like (minúsculo) consumindo 4 valores do `rng`. */
export function mockUuid(rng: Rng): string {
  const hex = Array.from({ length: 4 }, () =>
    Math.floor(rng.next() * 4294967296).toString(16).padStart(8, '0'),
  ).join('');
  const variant = '89ab'[parseInt(hex.charAt(16), 16) & 3];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Embaralhamento Fisher–Yates determinístico (não altera a entrada). */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/** Escolha ponderada (pesos > 0). */
export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  const total = items.reduce((s, it) => s + weight(it), 0);
  let roll = rng.next() * total;
  for (const it of items) {
    roll -= weight(it);
    if (roll < 0) return it;
  }
  return rng.pick(items);
}
