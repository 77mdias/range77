import {
  EnvironmentValidationError,
  loadAppEnv,
  type AppEnv,
  type TrackerSourceKind,
} from '@/config/env';
import { createCachedHenrikDevClient } from '@/services/henrikdev/cached-client';
import type { TrackerSource } from '@/services/tracker/source';
import { createHenrikDevSource } from './henrikdev-source';
import { createMockSource } from './mock-source';

/**
 * Seleção da fonte do tracker por `TRACKER_DATA_SOURCE` (padrão `mock`).
 * A HenrikDev só é construída quando escolhida explicitamente — o caminho
 * padrão nunca cria client nem toca a rede.
 */

export function getTrackerSourceKind(env: AppEnv = loadAppEnv()): TrackerSourceKind {
  return env.TRACKER_DATA_SOURCE;
}

/**
 * Fail-safe para slots de UI (layout/páginas): env inválido NUNCA derruba a
 * página — loga e assume simulado (melhor exibir o aviso do que afirmar dado real).
 */
export function isSimulatedDataSource(): boolean {
  try {
    return getTrackerSourceKind() === 'mock';
  } catch (error) {
    console.error('[tracker] TRACKER_DATA_SOURCE inválida; assumindo dados simulados.', error);
    return true;
  }
}

export function getTrackerSource(env: AppEnv = loadAppEnv()): TrackerSource {
  const kind = getTrackerSourceKind(env);
  switch (kind) {
    case 'mock':
      return createMockSource();
    case 'henrikdev':
      // Client com cache POR RECURSO (`henrikdev:*`): perfil e Breakdown
      // compartilham conta/MMR/histórico em vez de repetir upstream.
      return createHenrikDevSource(createCachedHenrikDevClient());
    case 'riot':
      throw new EnvironmentValidationError(
        'TRACKER_DATA_SOURCE=riot exige a Production API Key — ainda não disponível',
      );
  }
}

export { createHenrikDevSource } from './henrikdev-source';
export { createMockSource } from './mock-source';
