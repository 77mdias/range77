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

import {
  PASSWORD_STRENGTH_CHECKS,
  parsePasswordConfirmation,
  passwordStrength,
} from '@/lib/validation/credentials';

describe('passwordStrength', () => {
  it('exibe os três critérios do Stitch, nesta ordem', () => {
    expect(PASSWORD_STRENGTH_CHECKS.map((check) => check.id)).toEqual([
      'length',
      'alphanumeric',
      'entropy',
    ]);
    expect(PASSWORD_STRENGTH_CHECKS.map((check) => check.label)).toEqual([
      '8+ CARACTERES',
      'ALFANUMÉRICO',
      'ENTROPIA ELEVADA',
    ]);
  });

  it('senha vazia não cumpre nada', () => {
    const result = passwordStrength('');
    expect(result.score).toBe(0);
    expect(result.met).toEqual({ length: false, alphanumeric: false, entropy: false });
  });

  it('conta os critérios cumpridos cumulativamente', () => {
    expect(passwordStrength('abcdefgh').met).toEqual({
      length: true,
      alphanumeric: false,
      entropy: false,
    });
    expect(passwordStrength('abcdefg1').met).toEqual({
      length: true,
      alphanumeric: true,
      entropy: false,
    });
  });

  it('aceita símbolo ou 12+ caracteres como entropia elevada', () => {
    expect(passwordStrength('abcdefg1!').met.entropy).toBe(true);
    expect(passwordStrength('abcdefghijkl').met.entropy).toBe(true);
    expect(passwordStrength('segred0!valcoach').score).toBe(3);
  });

  it('acima do teto do servidor a senha deixa de cumprir o critério de comprimento', () => {
    expect(passwordStrength('a'.repeat(PASSWORD_MAX_LENGTH + 1)).met.length).toBe(false);
  });

  it('score nunca passa de 3', () => {
    expect(passwordStrength('ValkyriePrecision2024!').score).toBe(3);
  });
});

describe('parsePasswordConfirmation', () => {
  it('aceita quando as senhas coincidem', () => {
    expect(parsePasswordConfirmation('segred0!valcoach', 'segred0!valcoach')).toEqual({
      ok: true,
      value: 'segred0!valcoach',
    });
  });

  it('recusa quando divergem', () => {
    const result = parsePasswordConfirmation('segred0!valcoach', 'segred0!valcoacH');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('As senhas não coincidem.');
    }
  });

  it('recusa confirmação vazia', () => {
    expect(parsePasswordConfirmation('segred0!valcoach', '').ok).toBe(false);
  });
});
