'use client';

import { useEffect } from 'react';

/**
 * Error boundary GLOBAL — última linha de defesa quando a falha acontece no
 * próprio `layout.tsx` raiz (ex.: `NavUser` consultando o DB durante o SSR).
 *
 * O `error.tsx` de rota NÃO envolve o layout do mesmo segmento, então sem
 * este arquivo um erro no layout raiz vira exceção não capturada no cliente
 * e, em `next dev`, dispara full-reload em loop. Precisa declarar
 * `<html>`/`<body>` próprios porque SUBSTITUI o layout raiz.
 */
export default function GlobalError({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  readonly retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#f9f9f9',
          color: '#000000',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
        }}
      >
        <div
          role="alert"
          style={{
            width: '100%',
            maxWidth: '32rem',
            border: '1px solid #000000',
            borderRadius: '6px',
            background: '#ffffff',
            padding: '1.5rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#ba1a1a' }}>
            Erro crítico · shell global
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1rem', fontWeight: 600 }}>
            Não foi possível carregar o aplicativo
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#797861' }}>
            Uma falha de infraestrutura impediu a montagem do layout raiz.
            Tente novamente.
          </p>
          {error.digest !== undefined ? (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#797861' }}>
              Ref: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: '1rem',
              height: '2.75rem',
              padding: '0 1.5rem',
              border: '1px solid #000000',
              borderRadius: '6px',
              background: '#f5f841',
              color: '#000000',
              fontSize: '1rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
