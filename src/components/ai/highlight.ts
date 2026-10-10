/**
 * Tokenizer mínimo de JSON para o CodeViewer: classifica strings (chave ×
 * valor), números e literais. Puro e determinístico — só transforma texto
 * em tokens; o componente apenas renderiza.
 */

export type JsonTokenKind = 'key' | 'string' | 'number' | 'literal' | 'plain';

export interface JsonToken {
  readonly kind: JsonTokenKind;
  readonly text: string;
}

const TOKEN_PATTERN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function tokenizeJson(code: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(TOKEN_PATTERN)) {
    const [full, stringPart, colonPart, literalPart, numberPart] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      tokens.push({ kind: 'plain', text: code.slice(lastIndex, start) });
    }

    if (colonPart !== undefined) {
      tokens.push({ kind: 'key', text: stringPart ?? '' });
      tokens.push({ kind: 'plain', text: colonPart });
    } else if (stringPart !== undefined) {
      tokens.push({ kind: 'string', text: stringPart });
    } else if (literalPart !== undefined) {
      tokens.push({ kind: 'literal', text: literalPart });
    } else if (numberPart !== undefined) {
      tokens.push({ kind: 'number', text: numberPart });
    }

    lastIndex = start + full.length;
  }

  if (lastIndex < code.length) {
    tokens.push({ kind: 'plain', text: code.slice(lastIndex) });
  }

  return tokens;
}
