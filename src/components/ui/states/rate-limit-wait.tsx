'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { cx } from '@/lib/cx';

/**
 * RateLimitWait — tela de espera do rate limit da HenrikDev (Standard: 30
 * req/min). Mostra a contagem regressiva vinda do header `x-ratelimit-reset` e
 * re-renderiza a rota (Server Components) quando ela zera. Se a cota ainda
 * estiver estourada, o servidor devolve um novo `retryAfterSeconds` e a espera
 * re-arma; caso contrário, este componente desmonta e o conteúdo real aparece.
 */

export const DEFAULT_RETRY_SECONDS = 60;
/** Re-checagem quando o servidor não manda um novo valor (evita travar em 0). */
const RECHECK_SECONDS = 10;
/** Teto defensivo: o header é segundos-para-o-reset, nunca acima da janela. */
const MAX_RETRY_SECONDS = 300;

function normalizeRetrySeconds(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_RETRY_SECONDS;
  }
  return Math.min(MAX_RETRY_SECONDS, Math.ceil(value));
}

export interface RateLimitWaitProps {
  /** Segundos até a cota reabrir (header `x-ratelimit-reset`). */
  readonly retryAfterSeconds?: number;
  readonly className?: string;
}

export function RateLimitWait({ retryAfterSeconds, className }: RateLimitWaitProps) {
  const router = useRouter();
  const [total, setTotal] = useState(() => normalizeRetrySeconds(retryAfterSeconds));
  const [remaining, setRemaining] = useState(() => normalizeRetrySeconds(retryAfterSeconds));

  // Re-arma quando o servidor entrega um novo valor de reset.
  useEffect(() => {
    const next = normalizeRetrySeconds(retryAfterSeconds);
    setTotal(next);
    setRemaining(next);
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (remaining > 0) {
      const id = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1_000);
      return () => clearTimeout(id);
    }

    router.refresh();
    // Re-checagem: se o servidor ainda estiver limitado, a contagem volta a
    // rodar — e re-arma de verdade quando vier um novo `retryAfterSeconds`.
    setTotal(RECHECK_SECONDS);
    setRemaining(RECHECK_SECONDS);
    return undefined;
  }, [remaining, router]);

  const percent = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <div
      data-state="rate-limit"
      className={cx('overflow-hidden rounded-lg border border-line bg-surface-raised', className)}
    >
      <div className="flex flex-col items-start gap-4 border-l-4 border-accent p-6">
        <div>
          <p role="status" className="text-label uppercase text-text-secondary">
            Limite de consultas atingido
          </p>
          <p className="mt-1 font-display text-heading-sm text-text-primary">
            A HenrikDev libera 30 consultas por minuto. Estamos aguardando a cota reabrir.
          </p>
          <p className="mt-2 text-body text-text-secondary">
            Tentando novamente em{' '}
            <span className="tabular-nums text-text-primary">{remaining}s</span>…
          </p>
        </div>
        <ProgressBar
          value={percent}
          tone="accent"
          ariaLabel="Tempo até a cota reabrir"
          className="max-w-sm"
        />
        <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
          Tentar agora
        </Button>
      </div>
    </div>
  );
}
