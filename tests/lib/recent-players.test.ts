import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_RECENT_PLAYERS,
  addRecentPlayer,
  parseRecentPlayers,
  rankSnapshotFromOverview,
  readRecentPlayers,
  fetchRecentPlayerRank,
  saveRecentPlayer,
  saveRecentPlayerRank,
  serializeRecentPlayers,
  withRecentPlayerRank,
  type RecentPlayer,
} from '@/lib/recents/recent-players';

/**
 * SUITE TDD — perfis buscados recentemente (histórico da home). Cobre o
 * contrato puro (validação, dedupe, limite) e o fail-soft do storage:
 * SSR sem `window`, JSON corrompido e storage indisponível NUNCA lançam.
 */

const STORE: Record<string, string> = {};

const localStorageStub = {
  getItem: (key: string) => STORE[key] ?? null,
  setItem: (key: string, value: string) => {
    STORE[key] = value;
  },
};

beforeEach(() => {
  STORE['valcoach.recent-players.v2'] = '';
  vi.stubGlobal('window', { localStorage: localStorageStub });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseRecentPlayers', () => {
  it('valida entradas bem-formadas', () => {
    expect(
      parseRecentPlayers([
        { riotId: 'twmz#tower', region: 'br' },
        { riotId: 'next to nothing#NOWAY', region: 'na' },
      ]),
    ).toEqual([
      { riotId: 'twmz#tower', region: 'br' },
      { riotId: 'next to nothing#NOWAY', region: 'na' },
    ]);
  });

  it('descarta entrada inválida: sem #, região desconhecida, tipos errados', () => {
    expect(
      parseRecentPlayers([
        null,
        'string',
        { riotId: 'sem-tag', region: 'br' },
        { riotId: '#tag', region: 'br' },
        { riotId: 'nome#', region: 'br' },
        { riotId: 'twmz#tower', region: 'mars' },
        { riotId: 42, region: 'br' },
      ]),
    ).toEqual([]);
  });

  it('dedupe case-insensitive por região+riotId e limita ao máximo', () => {
    const many: RecentPlayer[] = [
      { riotId: 'a#aaa', region: 'br' },
      { riotId: 'b#bbb', region: 'br' },
      { riotId: 'c#ccc', region: 'br' },
      { riotId: 'd#ddd', region: 'br' },
      { riotId: 'e#eee', region: 'br' },
    ];
    const parsed = parseRecentPlayers(many);
    expect(parsed).toHaveLength(MAX_RECENT_PLAYERS);
    // Mais recente primeiro: "e" não entra, o limite corta pelo fim.
    expect(parsed[0]).toEqual({ riotId: 'a#aaa', region: 'br' });

    expect(
      parseRecentPlayers([{ riotId: 'TWMZ#TOWER', region: 'BR' }, { riotId: 'twmz#tower', region: 'br' }]),
    ).toEqual([{ riotId: 'TWMZ#TOWER', region: 'br' }]);
  });

  it('entrada crua que não é array → []', () => {
    expect(parseRecentPlayers(null)).toEqual([]);
    expect(parseRecentPlayers('nope')).toEqual([]);
    expect(parseRecentPlayers({ riotId: 'a#b' })).toEqual([]);
  });
});

describe('addRecentPlayer', () => {
  it('insere na frente e move duplicado existente para a primeira posição', () => {
    const list: RecentPlayer[] = [
      { riotId: 'old#one', region: 'br' },
      { riotId: 'older#two', region: 'na' },
    ];
    const updated = addRecentPlayer(list, { riotId: 'OLDER#TWO', region: 'na' });
    expect(updated).toEqual([
      { riotId: 'OLDER#TWO', region: 'na' },
      { riotId: 'old#one', region: 'br' },
    ]);
  });

  it('limita a lista ao máximo', () => {
    const full: RecentPlayer[] = [
      { riotId: 'a#aaa', region: 'br' },
      { riotId: 'b#bbb', region: 'br' },
      { riotId: 'c#ccc', region: 'br' },
      { riotId: 'd#ddd', region: 'br' },
    ];
    expect(addRecentPlayer(full, { riotId: 'e#eee', region: 'br' })).toHaveLength(
      MAX_RECENT_PLAYERS,
    );
    expect(addRecentPlayer(full, { riotId: 'e#eee', region: 'br' })[0]).toEqual({
      riotId: 'e#eee',
      region: 'br',
    });
  });

  it('entrada inválida devolve a lista inalterada', () => {
    const list: RecentPlayer[] = [{ riotId: 'a#aaa', region: 'br' }];
    expect(addRecentPlayer(list, { riotId: 'invalida', region: 'xx' as 'br' })).toEqual(list);
  });
});

describe('snapshot de rank/RR', () => {
  it('parse preserva rank/RR válidos e descarta inválidos', () => {
    expect(
      parseRecentPlayers([
        { riotId: 'nexus#BR1', region: 'br', rank: ' Ascendant 3 ', rr: 78 },
        { riotId: 'aspas#LEV', region: 'latam', rank: '', rr: -5 },
        { riotId: 'mwzera#FUR', region: 'br', rank: 42, rr: 12.5 },
      ]),
    ).toEqual([
      { riotId: 'nexus#BR1', region: 'br', rank: 'Ascendant 3', rr: 78 },
      { riotId: 'aspas#LEV', region: 'latam' },
      { riotId: 'mwzera#FUR', region: 'br' },
    ]);
  });

  it('nova busca (sem elo) preserva o snapshot conhecido', () => {
    const list: RecentPlayer[] = [
      { riotId: 'old#one', region: 'br' },
      { riotId: 'nexus#BR1', region: 'br', rank: 'Ascendant 3', rr: 78 },
    ];
    expect(addRecentPlayer(list, { riotId: 'NEXUS#BR1', region: 'br' })[0]).toEqual({
      riotId: 'NEXUS#BR1',
      region: 'br',
      rank: 'Ascendant 3',
      rr: 78,
    });
  });

  it('withRecentPlayerRank atualiza no lugar, sem reordenar nem inserir', () => {
    const list: RecentPlayer[] = [
      { riotId: 'old#one', region: 'br' },
      { riotId: 'Nexus#BR1', region: 'br', rank: 'Diamond 1', rr: 10 },
    ];
    expect(
      withRecentPlayerRank(list, { riotId: 'nexus#br1', region: 'br', rank: 'Ascendant 3', rr: 78 }),
    ).toEqual([
      { riotId: 'old#one', region: 'br' },
      { riotId: 'Nexus#BR1', region: 'br', rank: 'Ascendant 3', rr: 78 },
    ]);
    expect(withRecentPlayerRank(list, { riotId: 'outro#x', region: 'br', rr: 1 })).toEqual(list);
    expect(withRecentPlayerRank(list, { riotId: 'invalida', region: 'br' })).toEqual(list);
  });

  it('rankSnapshotFromOverview: mmr v2 primeiro, mmr-history como fallback', () => {
    const history = [
      { tier: 'Diamond 1', rr: 10 },
      { tier: 'Diamond 2', rr: 24 },
    ];
    expect(
      rankSnapshotFromOverview({ rank: { tier: 'Ascendant 3', rrInTier: 78 }, rrHistory: history }),
    ).toEqual({ rank: 'Ascendant 3', rr: 78 });
    expect(
      rankSnapshotFromOverview({ rank: { tier: null, rrInTier: null }, rrHistory: history }),
    ).toEqual({ rank: 'Diamond 2', rr: 24 });
    expect(rankSnapshotFromOverview({ rank: null, rrHistory: [] })).toEqual({});
  });

  it('saveRecentPlayerRank sem rank/RR apaga o snapshot guardado', () => {
    STORE['valcoach.recent-players.v2'] = serializeRecentPlayers([
      { riotId: 'privado#BR1', region: 'br', rank: 'Gold 1', rr: 40 },
    ]);
    saveRecentPlayerRank({ riotId: 'privado#BR1', region: 'br' });
    expect(JSON.parse(STORE['valcoach.recent-players.v2'])).toEqual([
      { riotId: 'privado#BR1', region: 'br' },
    ]);
  });

  it('saveRecentPlayerRank persiste o snapshot', () => {
    STORE['valcoach.recent-players.v2'] = serializeRecentPlayers([
      { riotId: 'nexus#BR1', region: 'br' },
    ]);
    saveRecentPlayerRank({ riotId: 'nexus#BR1', region: 'br', rank: 'Ascendant 3', rr: 78 });
    expect(JSON.parse(STORE['valcoach.recent-players.v2'])).toEqual([
      { riotId: 'nexus#BR1', region: 'br', rank: 'Ascendant 3', rr: 78 },
    ]);
  });
});

describe('serialize/parse roundtrip', () => {
  it('preserva a lista', () => {
    const list: RecentPlayer[] = [
      { riotId: 'next to nothing#NOWAY', region: 'na' },
      { riotId: 'twmz#tower', region: 'br' },
    ];
    expect(parseRecentPlayers(JSON.parse(serializeRecentPlayers(list)))).toEqual(list);
  });
});

describe('storage (fail-soft)', () => {
  it('readRecentPlayers lê o histórico do navegador', () => {
    STORE['valcoach.recent-players.v2'] = serializeRecentPlayers([
      { riotId: 'twmz#tower', region: 'br' },
    ]);
    expect(readRecentPlayers()).toEqual([{ riotId: 'twmz#tower', region: 'br' }]);
  });

  it('saveRecentPlayer persiste e devolve a lista atualizada (recente primeiro)', () => {
    STORE['valcoach.recent-players.v2'] = serializeRecentPlayers([
      { riotId: 'old#one', region: 'br' },
    ]);
    const updated = saveRecentPlayer({ riotId: 'novo#dois', region: 'na' });
    expect(updated[0]).toEqual({ riotId: 'novo#dois', region: 'na' });
    expect(JSON.parse(STORE['valcoach.recent-players.v2'])).toEqual(updated);
  });

  it('storage quebrado (throw) → [] sem lançar', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
      },
    });
    expect(readRecentPlayers()).toEqual([]);
    expect(() => saveRecentPlayer({ riotId: 'a#aaa', region: 'br' })).not.toThrow();
  });

  it('histórico v1 (Riot IDs reais da era HenrikDev) é ignorado', () => {
    STORE['valcoach.recent-players.v2'] = '';
    STORE['valcoach.recent-players.v1'] = serializeRecentPlayers([
      { riotId: 'legado#OLD', region: 'br', rank: 'Diamond 2', rr: 10 },
    ]);
    expect(readRecentPlayers()).toEqual([]);
  });

  it('JSON corrompido → [] sem lançar', () => {
    STORE['valcoach.recent-players.v2'] = '{não é json';
    expect(readRecentPlayers()).toEqual([]);
  });
});

describe('sem window (SSR/node)', () => {
  it('read/save são no-ops seguros', () => {
    vi.unstubAllGlobals();
    expect(readRecentPlayers()).toEqual([]);
    expect(saveRecentPlayer({ riotId: 'a#aaa', region: 'br' })).toEqual([
      { riotId: 'a#aaa', region: 'br' },
    ]);
  });
});

describe('fetchRecentPlayerRank (revalidação fail-soft)', () => {
  const stale: RecentPlayer = { riotId: 'Alvo#BR1', region: 'br', rank: 'Gold 1', rr: 40 };
  const signal = new AbortController().signal;

  it('sucesso → snapshot atualizado, consultando o overview do jogador', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ rank: { tier: 'Platinum 2', rrInTier: 12 }, rrHistory: [] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchRecentPlayerRank(stale, signal)).resolves.toEqual({
      riotId: 'Alvo#BR1',
      region: 'br',
      rank: 'Platinum 2',
      rr: 12,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/players/br/Alvo/BR1/overview?size=1', { signal });
  });

  it('404 (perfil privado) → entrada sem rank/RR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    await expect(fetchRecentPlayerRank(stale, signal)).resolves.toEqual({
      riotId: 'Alvo#BR1',
      region: 'br',
    });
  });

  it('falha de rede → entrada sem rank/RR, sem lançar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network');
      }),
    );
    await expect(fetchRecentPlayerRank(stale, signal)).resolves.toEqual({
      riotId: 'Alvo#BR1',
      region: 'br',
    });
  });
});
