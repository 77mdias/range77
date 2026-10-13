import type { ApiErrorBody } from '@/contracts/coach';
import { ErrorState } from './error-state';
import { RateLimitWait } from './rate-limit-wait';

/**
 * UpstreamErrorState — escolhe a apresentação do erro de upstream: no
 * `UPSTREAM_RATE_LIMITED` (429 da HenrikDev) mostra a tela de espera com
 * auto-retry; nos demais casos, o `ErrorState` comum.
 */

export interface UpstreamErrorStateProps {
  readonly error: ApiErrorBody;
  /** Segundos até a cota reabrir (só relevante no rate limit). */
  readonly retryAfterSeconds?: number;
  readonly className?: string;
}

export function UpstreamErrorState({
  error,
  retryAfterSeconds,
  className,
}: UpstreamErrorStateProps) {
  if (error.error.code === 'UPSTREAM_RATE_LIMITED') {
    return <RateLimitWait retryAfterSeconds={retryAfterSeconds} className={className} />;
  }
  return <ErrorState error={error} className={className} />;
}
