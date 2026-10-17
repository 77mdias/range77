'use client';

/**
 * Fronteira de erro do grupo `(app)`. Como o `error.js` NÃO envolve o
 * `layout.js` do mesmo segmento, este arquivo renderiza DENTRO de
 * `src/app/(app)/layout.tsx` — é exatamente por isso que o `AppShell`
 * (header + footer) sobrevive a um erro de rota do grupo, em vez de ser
 * substituído pelo card. O card em si é o compartilhado
 * (`@/components/layout/route-error`), idêntico ao do root.
 */
export { RouteError as default } from '@/components/layout/route-error';
