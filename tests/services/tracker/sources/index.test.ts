import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * SUITE TDD — seleção da fonte do tracker por `TRACKER_DATA_SOURCE` e prova
 * de que o caminho padrão (mock) NUNCA constrói um client da HenrikDev.
 */

const spies = vi.hoisted(() => ({
  createHenrikDevClient: vi.fn(),
  createCachedHenrikDevClient: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: spies.cacheTag }));

vi.mock('@/services/henrikdev/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/henrikdev/client')>();
  return {
    ...original,
    createHenrikDevClient: spies.createHenrikDevClient.mockImplementation(
      original.createHenrikDevClient,
    ),
  };
});

vi.mock('@/services/henrikdev/cached-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/henrikdev/cached-client')>();
  return {
    ...original,
    createCachedHenrikDevClient: spies.createCachedHenrikDevClient.mockImplementation(
      original.createCachedHenrikDevClient,
    ),
  };
});

import { EnvironmentValidationError, loadAppEnv } from '@/config/env';
import {
  getCachedBreakdownOverview,
  getCachedMatchDetail,
  getCachedPlayerCard,
  getCachedPlayerOverview,
} from '@/lib/cache/tracker';
import {
  getTrackerSource,
  getTrackerSourceKind,
  isSimulatedDataSource,
} from '@/services/tracker/sources';

const fetchSpy = vi.fn(async () => {
  throw new Error('rede proibida no caminho mock');
});

beforeEach(() => {
  spies.createHenrikDevClient.mockClear();
  spies.createCachedHenrikDevClient.mockClear();
  spies.cacheTag.mockClear();
  fetchSpy.mockClear();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getTrackerSourceKind', () => {
  it('ausente → mock', () => {
    expect(getTrackerSourceKind(loadAppEnv({ APP_ENV: 'test' }))).toBe('mock');
  });

  it("'MOCK' → mock", () => {
    expect(getTrackerSourceKind(loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: 'MOCK' }))).toBe(
      'mock',
    );
  });

  it("'xpto' → lança EnvironmentValidationError", () => {
    expect(() =>
      getTrackerSourceKind(loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: 'xpto' })),
    ).toThrowError(EnvironmentValidationError);
  });

  it('sem env explícito lê process.env', () => {
    vi.stubEnv('TRACKER_DATA_SOURCE', 'henrikdev');
    expect(getTrackerSourceKind()).toBe('henrikdev');
  });
});

describe('isSimulatedDataSource', () => {
  it('mock/ausente → true; real → false; inválida → true sem lançar', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubEnv('TRACKER_DATA_SOURCE', 'henrikdev');
    expect(isSimulatedDataSource()).toBe(false);
    vi.stubEnv('TRACKER_DATA_SOURCE', 'xpto');
    expect(() => isSimulatedDataSource()).not.toThrow();
    expect(isSimulatedDataSource()).toBe(true);
    expect(spy).toHaveBeenCalled();
    vi.stubEnv('TRACKER_DATA_SOURCE', 'mock');
    expect(isSimulatedDataSource()).toBe(true);
    spy.mockRestore();
  });
});

describe('getTrackerSource', () => {
  it('mock por padrão', () => {
    expect(getTrackerSource(loadAppEnv({ APP_ENV: 'test' })).kind).toBe('mock');
  });

  it('henrikdev quando configurada', () => {
    const source = getTrackerSource(
      loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: 'henrikdev' }),
    );
    expect(source.kind).toBe('henrikdev');
  });

  it('riot ainda sem implementação → erro de configuração explícito', () => {
    const attempt = () =>
      getTrackerSource(loadAppEnv({ APP_ENV: 'test', TRACKER_DATA_SOURCE: 'riot' }));
    expect(attempt).toThrowError(EnvironmentValidationError);
    expect(attempt).toThrowError(
      'TRACKER_DATA_SOURCE=riot exige a Production API Key — ainda não disponível',
    );
  });
});

describe('camada de cache no caminho padrão (mock) — zero HenrikDev', () => {
  it('perfil, breakdown, partida e cartão funcionam sem env e sem rede', { timeout: 20_000 }, async () => {
    const overview = await getCachedPlayerOverview('br', 'ValCoachDemo', 'DEMO', 5);
    expect(overview.matches).toHaveLength(5);
    expect(overview.rank).not.toBeNull();
    expect(overview.combat.raw_metrics.matches).toBe(5);

    const breakdown = await getCachedBreakdownOverview('br', 'ValCoachDemo', 'DEMO');
    expect(breakdown.matches.length).toBeGreaterThan(5);

    const matchId = overview.matches[0]!.matchId;
    const detail = await getCachedMatchDetail('br', matchId, { name: 'ValCoachDemo', tag: 'DEMO' });
    expect(detail.matchId).toBe(matchId);

    expect(await getCachedPlayerCard('ValCoachDemo', 'DEMO')).toBeNull();

    expect(spies.createHenrikDevClient).not.toHaveBeenCalled();
    expect(spies.createCachedHenrikDevClient).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rotas de API reais (partida e combate) respondem com a fonte mock, sem HenrikDev', { timeout: 20_000 }, async () => {
    const { GET: getMatch } = await import('@/app/api/matches/[region]/[matchId]/route');
    const { GET: getPlayer } = await import('@/app/api/players/[region]/[name]/[tag]/route');
    const overview = await getCachedPlayerOverview('br', 'ValCoachDemo', 'DEMO', 1);
    const matchId = overview.matches[0]!.matchId;

    const withFocus = await getMatch(
      new Request(`http://localhost/api/matches/br/${matchId}?player=ValCoachDemo%23DEMO`),
      { params: Promise.resolve({ region: 'br', matchId }) },
    );
    expect(withFocus.status).toBe(200);
    expect(((await withFocus.json()) as { matchId: string }).matchId).toBe(matchId);

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const noFocus = await getMatch(new Request(`http://localhost/api/matches/br/${matchId}`), {
      params: Promise.resolve({ region: 'br', matchId }),
    });
    expect(noFocus.status).toBe(404);
    // Sem foco não há consentimento a verificar → 404 neutro (Task 14).
    expect(((await noFocus.json()) as { error: { code: string } }).error.code).toBe(
      'PROFILE_NOT_PUBLIC',
    );

    const player = await getPlayer(new Request('http://localhost/api/players/br/ValCoachDemo/DEMO'), {
      params: Promise.resolve({ region: 'br', name: 'ValCoachDemo', tag: 'DEMO' }),
    });
    expect(player.status).toBe(200);

    expect(spies.createHenrikDevClient).not.toHaveBeenCalled();
    expect(spies.createCachedHenrikDevClient).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('cacheTags incluem o kind da fonte e o foco da partida', async () => {
    await getCachedPlayerOverview('br', 'ValCoachDemo', 'DEMO', 5);
    const overview = await getCachedPlayerOverview('br', 'ValCoachDemo', 'DEMO', 1);
    await getCachedMatchDetail('br', overview.matches[0]!.matchId, { name: 'ValCoachDemo', tag: 'DEMO' });

    const tags = spies.cacheTag.mock.calls.map((call) => String(call[0]));
    expect(tags).toContain('player-overview:mock:br:valcoachdemo:demo:5');
    expect(tags).toContain(
      `match:mock:br:${overview.matches[0]!.matchId}:valcoachdemo#demo`,
    );
  });
});
