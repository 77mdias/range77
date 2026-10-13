import type {
  HenrikDevAccountResponseV1,
  HenrikDevAccountV1,
  HenrikDevMatchResponseV4,
  HenrikDevMatchV4,
  HenrikDevMatchesResponseV4,
  HenrikDevMmrHistoryEntryV2,
  HenrikDevMmrHistoryResponseV2,
  HenrikDevMmrResponseV2,
  HenrikDevMmrV2,
  HenrikDevMmrV3,
  HenrikDevMmrV3Response,
} from '@/contracts/henrikdev';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: client HTTP da HenrikDev (v4).
 *
 * - Autenticação por header `Authorization` (documentado no OpenAPI 4.6.0);
 * - Timeout padrão de 15s via AbortSignal (payloads v4 são pesados);
 * - Erros HTTP preservam o corpo documentado `{errors:[{code,message}]}`;
 * - Falhas de rede/malformação viram HenrikDevApiError com status 0/502 —
 *   a rota faz o mapping HTTP adequado para o chatbot.
 */

/** Prefixo estável do `name`; o status HTTP é anexado (`HenrikDevApiError:404`). */
export const HENRIKDEV_ERROR_NAME = 'HenrikDevApiError';

export class HenrikDevApiError extends Error {
  constructor(
    /** Status HTTP upstream (0 = falha antes de resposta). */
    readonly status: number,
    message: string,
    /** Código interno da HenrikDev ou rótulo nosso (NETWORK_ERROR etc.). */
    readonly code?: number | string,
  ) {
    super(message);
    // A fronteira `'use cache'` do Next serializa o erro ao propagar e preserva
    // apenas `name`/`message` (protótipo e props próprias — `status`/`code` —
    // somem, invalidando `instanceof`). Embutir o status no `name` mantém o
    // mapeamento HTTP funcionando DEPOIS do cache. Ver `henrikDevErrorStatus`.
    this.name = `${HENRIKDEV_ERROR_NAME}:${status}`;
  }
}

/**
 * Status HTTP de um erro da HenrikDev, robusto à serialização imposta pela
 * fronteira `'use cache'`. Antes do cache vale o `instanceof`; depois, só o
 * `name` sobrevive — por isso o status é lido do prefixo codificado nele.
 */
export function henrikDevErrorStatus(error: unknown): number | null {
  if (error instanceof HenrikDevApiError) {
    return error.status;
  }
  if (error instanceof Error) {
    const prefix = `${HENRIKDEV_ERROR_NAME}:`;
    if (error.name.startsWith(prefix)) {
      const parsed = Number.parseInt(error.name.slice(prefix.length), 10);
      if (Number.isInteger(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

export interface HenrikDevClientOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  /** Injeção para testes (padrão: fetch global). */
  readonly fetchFn?: typeof fetch;
}

export interface FetchPlayerMatchesParams {
  readonly affinity: string;
  readonly platform: string;
  readonly name: string;
  readonly tag: string;
  readonly mode?: string;
  readonly size?: number;
  readonly start?: number;
}

export interface FetchMatchByIdParams {
  readonly affinity: string;
  readonly matchId: string;
}

export interface FetchMmrHistoryParams {
  readonly affinity: string;
  readonly platform: string;
  readonly name: string;
  readonly tag: string;
}

export interface FetchAccountParams {
  readonly name: string;
  readonly tag: string;
}

export interface FetchMmrParams {
  readonly affinity: string;
  readonly platform: string;
  readonly name: string;
  readonly tag: string;
}

export interface HenrikDevClient {
  fetchPlayerMatches(params: FetchPlayerMatchesParams): Promise<readonly HenrikDevMatchV4[]>;
  /** Detalhe de UMA partida por match_id (v4 match_v4 — sem platform). */
  fetchMatchById(params: FetchMatchByIdParams): Promise<HenrikDevMatchV4>;
  /**
   * Movimento de RR das partidas competitivas recentes (v2 mmr-history).
   * Entradas podem vir incompletas — a normalização é do
   * `services/analytics/rr-trend.ts`.
   */
  fetchMmrHistory(params: FetchMmrHistoryParams): Promise<readonly HenrikDevMmrHistoryEntryV2[]>;
  /**
   * Identidade estendida da conta (v1 account): nível + cartão com os
   * ícones oficiais do jogador.
   */
  fetchAccount(params: FetchAccountParams): Promise<HenrikDevAccountV1>;
  /** Ranque atual (v2 mmr): tier, RR dentro do tier e imagens do elo. */
  fetchMmr(params: FetchMmrParams): Promise<HenrikDevMmrV2>;
  /**
   * Ranque + histórico POR TEMPORADA (v3 mmr): o `seasonal[]` diz quantas
   * partidas o jogador tem em cada ato — usado pela amostra dinâmica do
   * Breakdown. Não substitui o v2 (que ainda fornece as imagens do elo).
   */
  fetchMmrV3(params: FetchMmrParams): Promise<HenrikDevMmrV3>;
}

const DEFAULT_BASE_URL = 'https://api.henrikdev.xyz';
/**
 * O payload v4 de N partidas completas chega a MBs (kills, rounds, stats por
 * round). 15s cobre downloads grandes em links medianos sem travar a rota.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

export function createHenrikDevClient(options: HenrikDevClientOptions): HenrikDevClient {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetchFn ?? fetch;

  /**
   * GET + parse sob a MESMA proteção: o payload é grande e o abort pode
   * disparar DEPOIS dos headers, durante o stream do body — um TimeoutError
   * no json() precisa virar NETWORK_ERROR, não um 500 interno não identificado.
   */
  async function requestJson(url: URL): Promise<unknown> {
    try {
      const response = await doFetch(url, {
        headers: { Authorization: options.apiKey },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        let message = `HenrikDev respondeu ${response.status}`;
        let code: number | string | undefined;
        try {
          const body = (await response.json()) as {
            errors?: Array<{ message?: unknown; code?: unknown }>;
          };
          const first = body?.errors?.[0];
          if (first !== undefined && typeof first.message === 'string') {
            message = first.message;
          }
          if (first !== undefined && typeof first.code === 'number') {
            code = first.code;
          }
        } catch {
          // corpo não-JSON — mantém a mensagem fallback com o status
        }
        throw new HenrikDevApiError(response.status, message, code);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HenrikDevApiError) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new HenrikDevApiError(
        0,
        `Falha de rede ao contatar a HenrikDev: ${reason}`,
        'NETWORK_ERROR',
      );
    }
  }

  return {
    async fetchPlayerMatches(params) {
      const url = new URL(
        `${baseUrl}/valorant/v4/matches/${params.affinity}/${params.platform}` +
          `/${encodeURIComponent(params.name)}/${encodeURIComponent(params.tag)}`,
      );
      if (params.mode !== undefined) {
        url.searchParams.set('mode', params.mode);
      }
      if (params.size !== undefined) {
        url.searchParams.set('size', String(params.size));
      }
      if (params.start !== undefined) {
        url.searchParams.set('start', String(params.start));
      }

      const parsed = await requestJson(url);
      const body = parsed as HenrikDevMatchesResponseV4 | readonly HenrikDevMatchV4[];
      const data = Array.isArray(body) ? body : (body as HenrikDevMatchesResponseV4)?.data;
      if (!Array.isArray(data)) {
        throw new HenrikDevApiError(
          502,
          'Resposta malformada da HenrikDev: campo "data" ausente',
          'MALFORMED_RESPONSE',
        );
      }
      return data;
    },

    async fetchMatchById(params) {
      const url = new URL(
        `${baseUrl}/valorant/v4/match/${params.affinity}/${encodeURIComponent(params.matchId)}`,
      );

      const parsed = await requestJson(url);
      const body = parsed as HenrikDevMatchResponseV4;
      const candidate = (body?.data ?? parsed) as unknown;
      const looksLikeMatch =
        candidate !== null &&
        typeof candidate === 'object' &&
        !Array.isArray(candidate) &&
        'metadata' in candidate;
      if (!looksLikeMatch) {
        throw new HenrikDevApiError(
          502,
          'Resposta malformada da HenrikDev: detalhe da partida ausente em "data"',
          'MALFORMED_RESPONSE',
        );
      }
      return candidate as HenrikDevMatchV4;
    },

    async fetchMmrHistory(params) {
      const url = new URL(
        `${baseUrl}/valorant/v2/mmr-history/${params.affinity}/${params.platform}` +
          `/${encodeURIComponent(params.name)}/${encodeURIComponent(params.tag)}`,
      );

      const parsed = await requestJson(url);
      const body = parsed as HenrikDevMmrHistoryResponseV2;
      const history = body?.data?.history;
      if (!Array.isArray(history)) {
        throw new HenrikDevApiError(
          502,
          'Resposta malformada da HenrikDev: histórico de MMR ausente em "data.history"',
          'MALFORMED_RESPONSE',
        );
      }
      return history;
    },

    async fetchAccount(params) {
      const url = new URL(
        `${baseUrl}/valorant/v1/account/${encodeURIComponent(params.name)}/${encodeURIComponent(params.tag)}`,
      );

      const parsed = await requestJson(url);
      const body = parsed as HenrikDevAccountResponseV1;
      const account = body?.data;
      if (account === null || typeof account !== 'object' || Array.isArray(account)) {
        throw new HenrikDevApiError(
          502,
          'Resposta malformada da HenrikDev: conta ausente em "data"',
          'MALFORMED_RESPONSE',
        );
      }
      return account;
    },

    async fetchMmr(params) {
      // v2/mmr NÃO aceita o segmento de plataforma (diferente de v3/mmr e de
      // v2/mmr-history): com `/pc/` a HenrikDev responde 404 "Route not found",
      // o que zerava o rank de todo perfil.
      const url = new URL(
        `${baseUrl}/valorant/v2/mmr/${params.affinity}` +
          `/${encodeURIComponent(params.name)}/${encodeURIComponent(params.tag)}`,
      );

      const parsed = await requestJson(url);
      const body = parsed as HenrikDevMmrResponseV2;
      const mmr = body?.data;
      if (mmr === null || typeof mmr !== 'object' || Array.isArray(mmr)) {
        throw new HenrikDevApiError(
          502,
          'Resposta malformada da HenrikDev: MMR ausente em "data"',
          'MALFORMED_RESPONSE',
        );
      }
      return mmr;
    },

    async fetchMmrV3(params) {
      const url = new URL(
        `${baseUrl}/valorant/v3/mmr/${params.affinity}/${params.platform}` +
          `/${encodeURIComponent(params.name)}/${encodeURIComponent(params.tag)}`,
      );

      const parsed = await requestJson(url);
      const body = parsed as HenrikDevMmrV3Response;
      const mmr = body?.data;
      if (mmr === null || typeof mmr !== 'object' || Array.isArray(mmr)) {
        throw new HenrikDevApiError(
          502,
          'Resposta malformada da HenrikDev: MMR v3 ausente em "data"',
          'MALFORMED_RESPONSE',
        );
      }
      return mmr;
    },
  };
}
