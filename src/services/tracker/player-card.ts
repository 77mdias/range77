import { loadAppEnv, requireEnv } from '@/config/env';
import {
  createHenrikDevClient,
  type HenrikDevClient,
} from '@/services/henrikdev/client';
import { resolveAccountCard } from '@/services/henrikdev/normalize-tracker';

/**
 * Cartão de jogador (in-game player card) para um Riot ID via HenrikDev v1
 * account. É BEST-EFFORT: qualquer falha (conta inexistente, limite, rede)
 * devolve `null` e a view cai no fallback — nunca fabricamos uma imagem.
 */

export interface GetPlayerCardParams {
  readonly name: string;
  readonly tag: string;
  /** Cliente injetável (testes); default cria o cliente real. */
  readonly client?: HenrikDevClient;
}

export async function getPlayerCard(params: GetPlayerCardParams): Promise<string | null> {
  const client =
    params.client ??
    createHenrikDevClient({ apiKey: requireEnv(loadAppEnv(), 'HENRIKDEV_API_KEY') });

  try {
    return resolveAccountCard(await client.fetchAccount({ name: params.name, tag: params.tag }));
  } catch {
    return null;
  }
}
