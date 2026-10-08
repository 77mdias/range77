import type {
  HenrikDevMatchV4,
  HenrikDevMatchesResponseV4,
} from '@/contracts/henrikdev';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: client HTTP da HenrikDev (v4).
 *
 * - Autenticação por header `Authorization` (documentado no OpenAPI 4.6.0);
 * - Timeout padrão de 10s via AbortSignal;
 * - Erros HTTP preservam o corpo documentado `{errors:[{code,message}]}`;
 * - Falhas de rede/malformação viram HenrikDevApiError com status 0/502 —
 *   a rota faz o mapping HTTP adequado para o chatbot.
 */

export class HenrikDevApiError extends Error {
  constructor(
    /** Status HTTP upstream (0 = falha antes de resposta). */
    readonly status: number,
    message: string,
    /** Código interno da HenrikDev ou rótulo nosso (NETWORK_ERROR etc.). */
    readonly code?: number | string,
  ) {
    super(message);
    this.name = 'HenrikDevApiError';
  }
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

export interface HenrikDevClient {
  fetchPlayerMatches(params: FetchPlayerMatchesParams): Promise<readonly HenrikDevMatchV4[]>;
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

      // fetch E leitura do corpo ficam sob a mesma proteção: o payload é
      // grande e o abort pode disparar DEPOIS dos headers, durante o stream
      // do body — um TimeoutError no json() precisava ser NETWORK_ERROR,
      // não um 500 interno não identificado.
      let parsed: unknown;
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

        parsed = await response.json();
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
  };
}
