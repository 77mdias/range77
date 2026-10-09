import { describe, expect, it } from 'vitest';
import {
  EMAIL_MAX_LENGTH,
  parseEmail,
  parsePassword,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@/lib/validation/credentials';

/**
 * SUITE TDD — validação de credenciais email+senha usada pelos formulários
 * de cadastro/login manuais. Os limites de senha espelham a configuração do
 * Better Auth em `src/lib/auth.ts` (fonte única: constantes deste módulo).
 */

describe('parseEmail', () => {
  it('aceita e normaliza um email válido (trim + minúsculas)', () => {
    expect(parseEmail('  Coach@ValCoach.dev ')).toEqual({
      ok: true,
      value: 'coach@valcoach.dev',
    });
  });

  it('rejeita entrada vazia', () => {
    expect(parseEmail('   ')).toEqual({ ok: false, message: 'Informe um endereço de e-mail.' });
  });

  it('rejeita formato sem @', () => {
    expect(parseEmail('coach.valcoach.dev').ok).toBe(false);
  });

  it('rejeita formato sem domínio', () => {
    expect(parseEmail('coach@').ok).toBe(false);
  });

  it('rejeita espaços internos', () => {
    expect(parseEmail('co ach@valcoach.dev').ok).toBe(false);
  });

  it(`rejeita emails acima de ${EMAIL_MAX_LENGTH} caracteres`, () => {
    const long = `${'a'.repeat(100)}@${'b'.repeat(200)}.com`;
    expect(long.length).toBeGreaterThan(EMAIL_MAX_LENGTH);
    const result = parseEmail(long);
    expect(result).toEqual({
      ok: false,
      message: `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`,
    });
  });
});

describe('parsePassword', () => {
  it('aceita senha dentro dos limites', () => {
    expect(parsePassword('segred0!valcoach')).toEqual({
      ok: true,
      value: 'segred0!valcoach',
    });
  });

  it('não faz trim (espaços fazem parte da senha)', () => {
    expect(parsePassword(' senha 123 ')).toEqual({ ok: true, value: ' senha 123 ' });
  });

  it(`rejeita senha com menos de ${PASSWORD_MIN_LENGTH} caracteres`, () => {
    const result = parsePassword('1234567');
    expect(result).toEqual({
      ok: false,
      message: `A senha deve ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`,
    });
  });

  it(`rejeita senha acima de ${PASSWORD_MAX_LENGTH} caracteres`, () => {
    const result = parsePassword('a'.repeat(PASSWORD_MAX_LENGTH + 1));
    expect(result).toEqual({
      ok: false,
      message: `A senha deve ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`,
    });
  });

  it('rejeita senha vazia com a mesma mensagem de comprimento', () => {
    const result = parsePassword('');
    expect(result).toEqual({
      ok: false,
      message: `A senha deve ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`,
    });
  });
});
