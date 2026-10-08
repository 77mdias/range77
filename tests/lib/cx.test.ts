import { describe, expect, it } from 'vitest';
import { cx } from '@/lib/cx';

/**
 * SUITE TDD — composição de classes do design system (join com filtro de
 * valores falsy). Base de todos os componentes da fase 1.
 */

describe('cx', () => {
  it('concatena classes com um espaço', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('descarta valores falsy (undefined/null/string vazia)', () => {
    expect(cx('a', undefined, null, '', 'b')).toBe('a b');
  });

  it('retorna string vazia quando não há classes válidas', () => {
    expect(cx()).toBe('');
    expect(cx(undefined, '')).toBe('');
  });
});
