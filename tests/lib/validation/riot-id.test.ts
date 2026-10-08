import { describe, expect, it } from 'vitest';
import {
  parseRiotId,
  RIOT_NAME_MAX_LENGTH,
  RIOT_TAG_PATTERN,
} from '@/lib/validation/riot-id';

/**
 * SUITE TDD — parse/validação de Riot ID (`Nome#Tag`) usada pela SearchBar.
 * Cobre caminho feliz, formatos inválidos e limites de nome/tag.
 */

describe('parseRiotId', () => {
  it('aceita o formato Nome#Tag', () => {
    expect(parseRiotId('TenZ#1234')).toEqual({
      ok: true,
      value: { name: 'TenZ', tag: '1234' },
    });
  });

  it('remove espaços em volta do nome e da tag', () => {
    expect(parseRiotId('  TenZ  #  1234  ')).toEqual({
      ok: true,
      value: { name: 'TenZ', tag: '1234' },
    });
  });

  it('rejeita entrada vazia', () => {
    const result = parseRiotId('   ');
    expect(result.ok).toBe(false);
  });

  it('rejeita entrada sem #', () => {
    expect(parseRiotId('TenZ').ok).toBe(false);
  });

  it('rejeita nome vazio (começa com #)', () => {
    expect(parseRiotId('#1234').ok).toBe(false);
  });

  it('rejeita tag vazia (termina com #)', () => {
    const result = parseRiotId('TenZ#');
    expect(result).toEqual({
      ok: false,
      message: 'A tag deve ter de 1 a 6 caracteres alfanuméricos.',
    });
  });

  it('rejeita nome acima do limite', () => {
    const longName = 'a'.repeat(RIOT_NAME_MAX_LENGTH + 1);
    expect(parseRiotId(`${longName}#1234`).ok).toBe(false);
  });

  it('aceita nome exatamente no limite', () => {
    const name = 'a'.repeat(RIOT_NAME_MAX_LENGTH);
    expect(parseRiotId(`${name}#1234`).ok).toBe(true);
  });

  it('rejeita tag com caracteres não alfanuméricos', () => {
    expect(parseRiotId('TenZ#12-3').ok).toBe(false);
  });

  it('rejeita tag com mais de 6 caracteres', () => {
    expect(parseRiotId('TenZ#1234567').ok).toBe(false);
  });

  it('aceita tag de 6 caracteres alfanuméricos', () => {
    expect(parseRiotId('TenZ#A1b2C3')).toEqual({
      ok: true,
      value: { name: 'TenZ', tag: 'A1b2C3' },
    });
  });

  it('expõe o padrão de tag reutilizável', () => {
    expect(RIOT_TAG_PATTERN.test('1234')).toBe(true);
    expect(RIOT_TAG_PATTERN.test('')).toBe(false);
  });
});
