import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_RECENT_PLAYERS,
  addRecentPlayer,
  parseRecentPlayers,
  readRecentPlayers,
  saveRecentPlayer,
  serializeRecentPlayers,
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
  STORE['valcoach.recent-players.v1'] = '';
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
    STORE['valcoach.recent-players.v1'] = serializeRecentPlayers([
      { riotId: 'twmz#tower', region: 'br' },
    ]);
    expect(readRecentPlayers()).toEqual([{ riotId: 'twmz#tower', region: 'br' }]);
  });

  it('saveRecentPlayer persiste e devolve a lista atualizada (recente primeiro)', () => {
    STORE['valcoach.recent-players.v1'] = serializeRecentPlayers([
      { riotId: 'old#one', region: 'br' },
    ]);
    const updated = saveRecentPlayer({ riotId: 'novo#dois', region: 'na' });
    expect(updated[0]).toEqual({ riotId: 'novo#dois', region: 'na' });
    expect(JSON.parse(STORE['valcoach.recent-players.v1'])).toEqual(updated);
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

  it('JSON corrompido → [] sem lançar', () => {
    STORE['valcoach.recent-players.v1'] = '{não é json';
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
