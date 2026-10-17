/**
 * Sanitiza o `?next=` que o proxy (Next 16) injeta ao redirecionar rotas
 * protegidas para `/login`. Só aceita caminho interno absoluto: `//host` e
 * `/\host` são tratados como protocol-relative pelo navegador (open redirect).
 */
export function resolveCallbackPath(next: string | string[] | undefined): string {
  if (typeof next !== 'string') {
    return '/dashboard';
  }
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/dashboard';
  }
  return next;
}
