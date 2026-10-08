/**
 * Validação/parse do Riot ID digitado pelo usuário (`Nome#Tag`).
 *
 * Módulo puro e compartilhado pela SearchBar (cliente) e por futuros
 * pontos de entrada. Regras alinhadas à rota de players:
 *   - nome: 1–32 caracteres (o `#` separa; nomes não podem conter `#`);
 *   - tag: 1–6 caracteres alfanuméricos.
 */

/** Comprimento máximo do game name (mesmo limite da rota de players). */
export const RIOT_NAME_MAX_LENGTH = 32;

/** Tag: 1–6 caracteres alfanuméricos (case-insensitive). */
export const RIOT_TAG_PATTERN = /^[A-Za-z0-9]{1,6}$/;

export interface RiotId {
  readonly name: string;
  readonly tag: string;
}

export type ParseRiotIdResult =
  | { readonly ok: true; readonly value: RiotId }
  | { readonly ok: false; readonly message: string };

const FORMAT_MESSAGE = 'Informe o Riot ID no formato Nome#Tag.';

/**
 * Faz o parse de `Nome#Tag`, retornando um resultado discriminado (`ok`).
 * O `#` é sempre o separador (nomes do Riot não podem contê-lo) — a
 * primeira ocorrência divide nome e tag.
 */
export function parseRiotId(raw: string): ParseRiotIdResult {
  const trimmed = raw.trim();
  const hashIndex = trimmed.indexOf('#');

  if (hashIndex <= 0) {
    return { ok: false, message: FORMAT_MESSAGE };
  }

  const name = trimmed.slice(0, hashIndex).trim();
  const tag = trimmed.slice(hashIndex + 1).trim();

  if (name === '' || name.length > RIOT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `O nome deve ter de 1 a ${RIOT_NAME_MAX_LENGTH} caracteres.`,
    };
  }

  if (!RIOT_TAG_PATTERN.test(tag)) {
    return { ok: false, message: 'A tag deve ter de 1 a 6 caracteres alfanuméricos.' };
  }

  return { ok: true, value: { name, tag } };
}
