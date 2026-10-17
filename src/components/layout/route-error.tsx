'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Card de erro de ROTA (App Router) compartilhado pelas DUAS fronteiras do
 * app: `src/app/error.tsx` (root) e `src/app/(app)/error.tsx` (grupo).
 *
 * Por que duas fronteiras: o `error.js` NÃO envolve o `layout.js` do mesmo
 * segmento. Desde que o `AppShell` mudou para `(app)/layout.tsx` ele ficou
 * ABAIXO do boundary raiz — ou seja, o card do root substituiria o shell e o
 * header/footer sumiriam em toda página de erro do grupo. A fronteira extra
 * no grupo fica DENTRO do `(app)/layout.tsx`, então o chrome sobrevive ao
 * erro. O card é o mesmo nos dois casos, daí viver aqui.
 *
 * Sem fronteira alguma, um erro num Server Component dentro de `<Suspense>`
 * vira exceção não capturada no cliente e, em `next dev`, entra no ciclo de
 * full-reload do `RuntimeErrorHandler` (a rota é requisitada sem parar).
 * Erros ESPERADOS continuam tratados dentro das páginas (envelope
 * `ErrorState`); aqui só caem falhas de infraestrutura/bug.
 */
export function RouteError({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) {
  useEffect(() => {
    // Diagnóstico no console do cliente; o Server Component já loga a causa.
    console.error(error);
  }, [error]);

  return (
    <div data-app-error className="w-full px-4 py-16 md:px-6 xl:px-8">
      <div
        role="alert"
        className="mx-auto max-w-xl overflow-hidden rounded-lg border border-line bg-surface-raised shadow-hard-2"
      >
        <div className="border-l-4 border-loss p-6">
          <p className="font-hud text-label uppercase text-loss">Erro · 500</p>
          <p className="mt-1 font-display text-heading-sm text-text-primary">
            Algo saiu do eixo nesta rota
          </p>
          <p className="mt-2 text-body text-text-secondary">
            Falha inesperada ao montar a página — normalmente uma fonte de dados
            indisponível no momento. Tente novamente.
          </p>
          {error.digest !== undefined ? (
            <p className="mt-2 font-hud text-label uppercase text-text-secondary">
              Ref: {error.digest}
            </p>
          ) : null}
          <div className="mt-4">
            <Button variant="primary" onClick={() => retry()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
