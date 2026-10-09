/**
 * Validação/parse de credenciais de acesso manual (email + senha).
 *
 * Módulo puro compartilhado pelos formulários de cadastro (`/signup`) e
 * login (`/login`). As constantes de comprimento de senha são a FONTE
 * ÚNICA consumida também pela configuração do Better Auth em
 * `src/lib/auth.ts` — os limites nunca divergem entre cliente e servidor.
 */

/** Limite pragmático de RFC 5321 para o campo inteiro. */
export const EMAIL_MAX_LENGTH = 254;

/** Mínimo do Better Auth (default da lib) — mantido explícito. */
export const PASSWORD_MIN_LENGTH = 8;

/** Teto anti-DoS de hash (scrypt) no servidor. */
export const PASSWORD_MAX_LENGTH = 128;

/** Comprimento máximo do nome exibido (mesmo teto do `user.name`). */
export const NAME_MAX_LENGTH = 64;

/**
 * Regex de formato de e-mail — deliberadamente simples (não é validação
 * de entrega): exige `local@domínio.tld` sem espaços e sem `@` extra.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ParseEmailResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export type ParsePasswordResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export type ParseNameResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function parseEmail(raw: string): ParseEmailResult {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { ok: false, message: 'Informe um endereço de e-mail.' };
  }

  if (trimmed.length > EMAIL_MAX_LENGTH) {
    return {
      ok: false,
      message: `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`,
    };
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return { ok: false, message: 'Informe um e-mail válido (ex.: nome@dominio.com).' };
  }

  // Normalização: e-mails são case-insensitive por convenção de mailbox.
  return { ok: true, value: trimmed.toLowerCase() };
}

export function parsePassword(raw: string): ParsePasswordResult {
  const length = raw.length;

  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `A senha deve ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value: raw };
}

export function parseName(raw: string): ParseNameResult {
  const trimmed = raw.trim();

  if (trimmed === '' || trimmed.length > NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `O nome deve ter de 1 a ${NAME_MAX_LENGTH} caracteres.`,
    };
  }

  return { ok: true, value: trimmed };
}
