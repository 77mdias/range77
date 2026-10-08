/** Junta classes descartando valores falsy (undefined/null/string vazia). */
export function cx(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
