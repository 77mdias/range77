import type { TrackerSourceKind } from '@/config/env';
import type { MatchCombatStats } from '@/contracts/henrikdev';
import type { MatchDetail, MatchSummary, RrHistoryPoint } from '@/contracts/tracker';
import type { ActSampleOptions } from '@/services/analytics/act-window';
import type { PlayerRankSummary } from '@/services/henrikdev/normalize-tracker';

/**
 * PORTA `TrackerSource` — de onde vêm os dados do tracker.
 * ======================================================================
 *
 * Toda tela (perfil, Breakdown, partida, cartão) consome esta porta, nunca um
 * fornecedor diretamente. Implementações (`./sources/*`):
 *   - `mock`     (PADRÃO): partidas SIMULADAS no formato Riot, determinísticas;
 *   - `henrikdev`: guardada no repo, fora do caminho padrão;
 *   - `riot`     : aguardando a Production API Key.
 *
 * A seleção é por `TRACKER_DATA_SOURCE` (`./sources/index.ts`).
 */

export type { TrackerSourceKind } from '@/config/env';

export interface PlayerSampleQuery {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
  /** Partidas na amostra fixa (perfil/API). */
  readonly size?: number;
  /** Amostra por ATO (Breakdown): tem precedência sobre `size`. */
  readonly actSample?: ActSampleOptions;
}

/** Amostra normalizada do jogador — mais recente primeiro. */
export interface PlayerSample {
  readonly matches: readonly MatchSummary[];
  /** Amostra canônica de combate, na MESMA ordem das partidas. */
  readonly combat: readonly MatchCombatStats[];
  /** Detalhes completos da amostra (Fase B usa; vazio por enquanto). */
  readonly details: readonly MatchDetail[];
  readonly level: number | null;
  readonly cardSrc: string | null;
  readonly rank: PlayerRankSummary | null;
  readonly rrHistory: readonly RrHistoryPoint[];
}

/** Riot ID do jogador em foco (perspectiva "VOCÊ" da partida). */
export interface MatchFocus {
  readonly name: string;
  readonly tag: string;
}

export interface TrackerSource {
  readonly kind: TrackerSourceKind;
  getPlayerSample(query: PlayerSampleQuery): Promise<PlayerSample>;
  /**
   * Detalhe da partida. `focus` é exigido pela fonte simulada (o `matchId`
   * deriva do Riot ID do foco); fontes reais o ignoram.
   */
  getMatchDetail(region: string, matchId: string, focus?: MatchFocus): Promise<MatchDetail>;
  /** Arte do cartão do jogador — best-effort: `null` quando indisponível. */
  getPlayerCard(name: string, tag: string): Promise<string | null>;
}

/**
 * `name` do erro de recurso inexistente na fonte. É o `name` (não a classe)
 * que sobrevive à fronteira `'use cache'` — o mapeamento HTTP
 * (`describeUpstreamError`) detecta por ele e responde 404.
 */
export const TRACKER_NOT_FOUND_ERROR_NAME = 'TrackerNotFoundError';

export class TrackerNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TRACKER_NOT_FOUND_ERROR_NAME;
  }
}
