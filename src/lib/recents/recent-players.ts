import { HENRIKDEV_AFFINITIES, type HenrikDevAffinity } from '@/contracts/henrikdev';

/**
 * Perfis buscados recentemente (client-only, persistido em `localStorage`).
 *
 * Alimenta a grade de perfis da home: cada busca concluída (hero da home ou
 * busca rápida do header) move o jogador para a frente da lista. Não há
 * back-end aqui — histórico é POR NAVEGADOR e a grade da home cai para os
 * perfis catalogados quando a lista está vazia.
 *
 * Fail-soft em toda a cadeia: SSR (`window` ausente), storage indisponível
 * (modo privado) e JSON corrompido devolvem lista vazia — nunca lançam.
 */

export interface RecentPlayer {
  /** Riot ID canônico `Nome#Tag` (aparência preservada para exibição). */
  readonly riotId: string;
  readonly region: HenrikDevAffinity;
}

/** Capacidade da grade da home (uma linha em `sm`, 2 colunas no mobile). */
export const MAX_RECENT_PLAYERS = 4;

const STORAGE_KEY = 'valcoach.recent-players.v1';

/** Riot ID plausível: `#` interno com nome e tag não vazios (limite da rota). */
const RIOT_ID_PATTERN = /^.{1,32}#.{1,6}$/;

function parseEntry(item: unknown): RecentPlayer | null {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  const { riotId, region } = item as Record<string, unknown>;
  if (typeof riotId !== 'string' || typeof region !== 'string') {
    return null;
  }
  const normalizedRegion = region.toLowerCase();
  const isAffinity = HENRIKDEV_AFFINITIES.some((affinity) => affinity === normalizedRegion);
  if (!isAffinity || !RIOT_ID_PATTERN.test(riotId.trim())) {
    return null;
  }
  return { riotId: riotId.trim(), region: normalizedRegion as HenrikDevAffinity };
}

function samePlayer(a: RecentPlayer, b: RecentPlayer): boolean {
  return a.region === b.region && a.riotId.toLowerCase() === b.riotId.toLowerCase();
}

/** Puro: valida a lista crua (de `JSON.parse`), dedupando e limitando. */
export function parseRecentPlayers(raw: unknown): RecentPlayer[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: RecentPlayer[] = [];
  for (const item of raw) {
    const entry = parseEntry(item);
    if (entry !== null && !out.some((existing) => samePlayer(existing, entry))) {
      out.push(entry);
    }
    if (out.length >= MAX_RECENT_PLAYERS) {
      break;
    }
  }
  return out;
}

/** Puro: move o jogador para a frente (dedupe case-insensitive) e limita. */
export function addRecentPlayer(
  list: readonly RecentPlayer[],
  entry: RecentPlayer,
): RecentPlayer[] {
  const parsed = parseEntry(entry);
  if (parsed === null) {
    return [...list];
  }
  return [parsed, ...list.filter((existing) => !samePlayer(existing, parsed))].slice(
    0,
    MAX_RECENT_PLAYERS,
  );
}

/** Puro: serializa para persistência. */
export function serializeRecentPlayers(list: readonly RecentPlayer[]): string {
  return JSON.stringify(list);
}

/** Lê o histórico do navegador (fail-soft: SSR/storage quebrado → `[]`). */
export function readRecentPlayers(): RecentPlayer[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return parseRecentPlayers(raw === null ? null : JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Registra um perfil buscado (fail-soft: storage indisponível não lança) e
 * devolve a lista atualizada. Entradas inválidas são ignoradas.
 */
export function saveRecentPlayer(entry: RecentPlayer): RecentPlayer[] {
  const updated = addRecentPlayer(readRecentPlayers(), entry);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeRecentPlayers(updated));
    } catch {
      // Modo privado/quota cheia: a lista em memória ainda é devolvida.
    }
  }
  return updated;
}
