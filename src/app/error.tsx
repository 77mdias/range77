'use client';

/**
 * Fronteira de erro do layout RAIZ. Cobre as rotas fora do grupo `(app)`
 * (telas de auth em `(auth)`) e os erros que escapam do próprio
 * `(app)/layout.tsx` — o `error.js` não envolve o layout do seu segmento,
 * então o do grupo não pega falhas do `AppShell`. O card vive em
 * `@/components/layout/route-error` e é compartilhado com a fronteira do
 * grupo.
 */
export { RouteError as default } from '@/components/layout/route-error';
