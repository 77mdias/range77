import { cacheLife } from 'next/cache';

/**
 * REPRO TEMPORÁRIO — nested `'use cache'` + await fora de ordem.
 * Isola o padrão do commit 03b0005 (matches/aux criados e aguardados depois).
 */

async function inner(label: string, ms: number): Promise<string> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });
  await new Promise((resolve) => setTimeout(resolve, ms));
  return label;
}

export async function cachedPattern(): Promise<string> {
  'use cache';
  cacheLife({ stale: 300, revalidate: 1500, expire: 21600 });

  const matchesPromise = inner('matches', 12000);
  const auxPromise = Promise.all([inner('rr', 12000), inner('card', 12000)]);

  const raw = await matchesPromise;
  const [rr, card] = await auxPromise;
  return `${raw}|${rr}|${card}`;
}
