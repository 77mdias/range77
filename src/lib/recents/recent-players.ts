import { HENRIKDEV_AFFINITIES, type HenrikDevAffinity } from '@/contracts/henrikdev';
import { parseRiotId } from '@/lib/validation/riot-id';

/**
 * Perfis buscados recentemente (client-only, persistido em `localStorage`).
 *
 * Alimenta a grade de perfis da home: cada busca concluída (hero da home ou
 * busca rápida do header) move o jogador para a frente da lista. Não há
 * back-end aqui — histórico é POR NAVEGADOR e a grade da home cai para os
 * perfis catalogados quando a lista está vazia.
 *
 * Rank/RR são um SNAPSHOT opcional: a busca grava só `riotId`+região e o
 * perfil do jogador, ao carregar, completa a entrada com o elo real
 * (`updateRecentPlayerRank`). Nada é inventado — sem snapshot o card mostra
 * só o nome.
 *
 * Fail-soft em toda a cadeia: SSR (`window` ausente), storage indisponível
 * (modo privado) e JSON corrompido devolvem lista vazia — nunca lançam.
 */

export interface RecentPlayer {
  /** Riot ID canônico `Nome#Tag` (aparência preservada para exibição). */
  readonly riotId: string;
  readonly region: HenrikDevAffinity;
  /** Snapshot do elo na última visita ao perfil (ex.: "Ascendant 3"). */
  readonly rank?: string;
  /** Snapshot do RR dentro do tier (0–100; Radiant/Immortal podem passar). */
  readonly rr?: number;
}

/** Capacidade da grade da home (uma linha em `sm`, 2 colunas no mobile). */
export const MAX_RECENT_PLAYERS = 4;

// v2: descarta o histórico v1 (Riot IDs reais com elo da era HenrikDev).
const STORAGE_KEY = 'valcoach.recent-players.v2';

/** Riot ID plausível: `#` interno com nome e tag não vazios (limite da rota). */
const RIOT_ID_PATTERN = /^.{1,32}#.{1,6}$/;

function parseEntry(item: unknown): RecentPlayer | null {
  if (typeof item !== 'object' || item === null) {
    return null;
  }
  const { riotId, region, rank, rr } = item as Record<string, unknown>;
  if (typeof riotId !== 'string' || typeof region !== 'string') {
    return null;
  }
  const normalizedRegion = region.toLowerCase();
  const isAffinity = HENRIKDEV_AFFINITIES.some((affinity) => affinity === normalizedRegion);
  if (!isAffinity || !RIOT_ID_PATTERN.test(riotId.trim())) {
    return null;
  }
  return {
    riotId: riotId.trim(),
    region: normalizedRegion as HenrikDevAffinity,
    ...(typeof rank === 'string' && rank.trim() !== '' ? { rank: rank.trim() } : {}),
    ...(typeof rr === 'number' && Number.isInteger(rr) && rr >= 0 ? { rr } : {}),
  };
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

/**
 * Puro: move o jogador para a frente (dedupe case-insensitive) e limita. Uma
 * busca nova (sem elo) preserva o snapshot de rank/RR já conhecido.
 */
export function addRecentPlayer(
  list: readonly RecentPlayer[],
  entry: RecentPlayer,
): RecentPlayer[] {
  const parsed = parseEntry(entry);
  if (parsed === null) {
    return [...list];
  }
  const previous = list.find((existing) => samePlayer(existing, parsed));
  const merged: RecentPlayer =
    previous !== undefined && parsed.rank === undefined && parsed.rr === undefined
      ? { ...parsed, ...pickRank(previous) }
      : parsed;
  return [merged, ...list.filter((existing) => !samePlayer(existing, parsed))].slice(
    0,
    MAX_RECENT_PLAYERS,
  );
}

function pickRank(player: RecentPlayer): Pick<RecentPlayer, 'rank' | 'rr'> {
  return {
    ...(player.rank !== undefined ? { rank: player.rank } : {}),
    ...(player.rr !== undefined ? { rr: player.rr } : {}),
  };
}

/**
 * Puro: substitui o snapshot de rank/RR de um jogador JÁ presente na lista,
 * sem reordenar (visitar um perfil não é uma busca). Jogador ausente ou
 * entrada inválida → lista inalterada.
 */
export function withRecentPlayerRank(
  list: readonly RecentPlayer[],
  entry: RecentPlayer,
): RecentPlayer[] {
  const parsed = parseEntry(entry);
  if (parsed === null) {
    return [...list];
  }
  return list.map((existing) =>
    samePlayer(existing, parsed)
      ? { riotId: existing.riotId, region: existing.region, ...pickRank(parsed) }
      : existing,
  );
}

/** Fatia do overview (`/api/players/.../overview`) que carrega o elo. */
export interface RankSource {
  readonly rank: { readonly tier: string | null; readonly rrInTier: number | null } | null;
  readonly rrHistory: readonly { readonly tier: string; readonly rr: number }[];
}

/**
 * Puro: snapshot de rank/RR a partir do overview — mesma regra do header do
 * perfil (mmr v2 primeiro; sem ele, o último ponto do mmr-history).
 */
export function rankSnapshotFromOverview(
  source: RankSource,
): Pick<RecentPlayer, 'rank' | 'rr'> {
  const last = source.rrHistory[source.rrHistory.length - 1];
  const rank = source.rank?.tier ?? last?.tier ?? undefined;
  const rr = source.rank?.rrInTier ?? last?.rr ?? undefined;
  return {
    ...(rank !== undefined ? { rank } : {}),
    ...(rr !== undefined ? { rr } : {}),
  };
}

/** Amostra mínima do overview: a revalidação só precisa do elo, não das partidas. */
const RANK_REFRESH_SIZE = 1;

/**
 * Revalida o elo de um recente pelo overview (gate de consentimento incluso).
 * Sucesso → snapshot atual; 404 (perfil privado), 429, rede ou JSON ruim →
 * entrada SEM rank/RR (o card cai para só o nome). Nunca lança.
 */
export async function fetchRecentPlayerRank(
  player: RecentPlayer,
  signal: AbortSignal,
): Promise<RecentPlayer> {
  const cleared: RecentPlayer = { riotId: player.riotId, region: player.region };
  const parsed = parseRiotId(player.riotId);
  if (!parsed.ok) {
    return cleared;
  }
  const { name, tag } = parsed.value;
  try {
    const response = await fetch(
      `/api/players/${player.region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}/overview?size=${RANK_REFRESH_SIZE}`,
      { signal },
    );
    if (!response.ok) {
      return cleared;
    }
    return { ...cleared, ...rankSnapshotFromOverview((await response.json()) as RankSource) };
  } catch {
    return cleared;
  }
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

function persist(list: readonly RecentPlayer[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeRecentPlayers(list));
  } catch {
    // Modo privado/quota cheia: a lista em memória ainda é devolvida.
  }
}

/**
 * Registra um perfil buscado (fail-soft: storage indisponível não lança) e
 * devolve a lista atualizada. Entradas inválidas são ignoradas.
 */
export function saveRecentPlayer(entry: RecentPlayer): RecentPlayer[] {
  const updated = addRecentPlayer(readRecentPlayers(), entry);
  persist(updated);
  return updated;
}

/**
 * Completa o snapshot de rank/RR de um perfil recente (fail-soft). Só toca
 * jogadores que já estão no histórico — visitas diretas não entram na lista.
 */
export function saveRecentPlayerRank(entry: RecentPlayer): RecentPlayer[] {
  const updated = withRecentPlayerRank(readRecentPlayers(), entry);
  persist(updated);
  return updated;
}
