'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Error boundary de ROTA (App Router). Captura exceções NÃO esperadas
 * lançadas ao renderizar `page.tsx` e segmentos filhos (o `error.js` não
 * envolve o layout do mesmo segmento — para o layout raiz ver
 * `global-error.tsx`).
 *
 * Sem esta fronteira, um erro num Server Component dentro de `<Suspense>`
 * vira exceção não capturada no cliente e, em `next dev`, entra no ciclo de
 * full-reload do `RuntimeErrorHandler` (a rota é requisitada sem parar).
 * Erros ESPERADOS continuam tratados dentro das páginas (envelope
 * `ErrorState`); aqui só caem falhas de infraestrutura/bug.
 */
export default function AppError({
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
