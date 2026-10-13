import { describe, expect, it } from 'vitest';
import {
  decodeRouteParam,
  parsePlayerPageParams,
  parsePlayerRouteParams,
} from '@/lib/validation/player-params';

/**
 * SUITE TDD — params de jogador.
 *
 * Regressão do bug "PLAYER_NOT_FOUND para jogador existente": os `params` de
 * PÁGINA do App Router chegam percent-encoded (`next%20to%20nothing`),
 * diferente dos Route Handlers (já decodificados). A página precisa decodificar
 * antes de montar a URL upstream, senão o Riot ID é re-codificado e a HenrikDev
 * responde "Account not found".
 */

describe('decodeRouteParam', () => {
  it('decodifica espaço e acento', () => {
    expect(decodeRouteParam('next%20to%20nothing')).toBe('next to nothing');
    expect(decodeRouteParam('jos%C3%A9')).toBe('josé');
  });

  it('mantém string já decodificada inalterada', () => {
    expect(decodeRouteParam('next to nothing')).toBe('next to nothing');
  });

  it('tolera `%` solto (sequência malformada) devolvendo o original', () => {
    expect(decodeRouteParam('50%')).toBe('50%');
    expect(decodeRouteParam('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('devolve valores não-string como estão', () => {
    expect(decodeRouteParam(undefined)).toBeUndefined();
    expect(decodeRouteParam(42)).toBe(42);
  });
});

describe('parsePlayerPageParams', () => {
  it('decodifica o nome com espaço antes de validar', () => {
    expect(parsePlayerPageParams({ region: 'br', name: 'next%20to%20nothing', tag: 'NOWAY' })).toEqual(
      { ok: true, region: 'br', name: 'next to nothing', tag: 'NOWAY' },
    );
  });

  it('decodifica nome acentuado', () => {
    const result = parsePlayerPageParams({ region: 'br', name: 'jos%C3%A9', tag: 'BR1' });
    expect(result).toEqual({ ok: true, region: 'br', name: 'josé', tag: 'BR1' });
  });

  it('valida normalmente após decodificar (região inválida continua barrada)', () => {
    expect(parsePlayerPageParams({ region: 'mars', name: 'next%20to%20nothing', tag: 'NOWAY' }).ok).toBe(
      false,
    );
  });
});

describe('parsePlayerRouteParams (Route Handlers)', () => {
  it('NÃO decodifica — os params de handler já chegam decodificados pelo Next', () => {
    const result = parsePlayerRouteParams({ region: 'br', name: 'next to nothing', tag: 'NOWAY' });
    expect(result).toEqual({ ok: true, region: 'br', name: 'next to nothing', tag: 'NOWAY' });
  });
});
