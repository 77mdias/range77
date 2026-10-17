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

/**
 * Força de senha — APRESENTAÇÃO apenas (medidor do Stitch, 3 barras).
 * Derivada dos limites deste módulo; NUNCA substitui a validação do servidor,
 * que continua sendo `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` no
 * `createAuth`.
 */

/** Comprimento a partir do qual a senha conta como "entropia elevada". */
export const PASSWORD_ENTROPY_LENGTH = 12;

export const PASSWORD_STRENGTH_CHECKS = [
  { id: 'length', label: '8+ CARACTERES' },
  { id: 'alphanumeric', label: 'ALFANUMÉRICO' },
  { id: 'entropy', label: 'ENTROPIA ELEVADA' },
] as const;

export type PasswordStrengthCheckId = (typeof PASSWORD_STRENGTH_CHECKS)[number]['id'];

export interface PasswordStrength {
  /** Quantos critérios cumpridos (0–3) — o número de barras acesas. */
  readonly score: 0 | 1 | 2 | 3;
  readonly met: Readonly<Record<PasswordStrengthCheckId, boolean>>;
}

const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SYMBOL = /[^A-Za-z0-9]/;

export function passwordStrength(raw: string): PasswordStrength {
  const met = {
    length: raw.length >= PASSWORD_MIN_LENGTH && raw.length <= PASSWORD_MAX_LENGTH,
    alphanumeric: HAS_LETTER.test(raw) && HAS_DIGIT.test(raw),
    entropy: HAS_SYMBOL.test(raw) || raw.length >= PASSWORD_ENTROPY_LENGTH,
  } satisfies Record<PasswordStrengthCheckId, boolean>;

  const score = (Object.values(met).filter(Boolean).length as 0 | 1 | 2 | 3);
  return { score, met };
}

/**
 * Confirmação de senha do cadastro. Guarda de UX: o endpoint `signUp.email` do
 * Better Auth recebe um único `password`, então a comparação não tem onde
 * rodar no servidor. Vive aqui para um futuro Server Action de troca de senha
 * reusá-la.
 */
export type ParsePasswordConfirmationResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string };

export function parsePasswordConfirmation(
  password: string,
  confirmation: string,
): ParsePasswordConfirmationResult {
  if (confirmation !== password) {
    return { ok: false, message: 'As senhas não coincidem.' };
  }
  return { ok: true, value: confirmation };
}
