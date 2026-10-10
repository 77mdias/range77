import { Badge } from '@/components/ui/badge';
import { cx } from '@/lib/cx';

/**
 * MatchMetaBar — faixa de metadados sob a navegação (detalhe de partida):
 * modo/fila, mapa, duração/servidor/match id e chip de delta RR.
 */

export interface MatchMetaBarProps {
  readonly queue: string;
  readonly map: string;
  /** Itens secundários (duração, servidor, match id). */
  readonly details?: readonly string[];
  readonly rrDelta?: number;
  /** Rótulo complementar do chip de RR (ex.: "ASC 3 • 84/100"). */
  readonly rrLabel?: string;
  readonly className?: string;
}

export function MatchMetaBar({
  queue,
  map,
  details,
  rrDelta,
  rrLabel,
  className,
}: MatchMetaBarProps) {
  const rrPositive = (rrDelta ?? 0) >= 0;

  return (
    <div
      data-component="match-meta-bar"
      className={cx(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-raised px-4 py-2.5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Badge variant="accent">{queue}</Badge>
        <span className="font-hud text-label uppercase text-text-primary">
          Mapa: <strong className="font-semibold">{map}</strong>
        </span>
        {(details ?? []).map((detail) => (
          <span key={detail} className="font-hud text-label uppercase text-text-secondary">
            {detail}
          </span>
        ))}
      </div>
      {rrDelta !== undefined ? (
        <div className="flex shrink-0 items-center gap-2 font-hud text-label uppercase text-text-secondary">
          Delta RR:
          <span
            data-rr-delta
            className={cx(
              'rounded-sm px-2 py-1 font-hud text-label font-semibold',
              rrPositive ? 'bg-accent text-text-primary' : 'bg-text-primary text-surface',
            )}
          >
            {rrPositive ? `+${rrDelta}` : rrDelta} RR{rrLabel !== undefined ? ` (${rrLabel})` : ''}
          </span>
        </div>
      ) : null}
    </div>
  );
}
