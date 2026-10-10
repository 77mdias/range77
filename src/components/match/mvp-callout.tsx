import { cx } from '@/lib/cx';

/**
 * MvpCallout — destaque do melhor jogador da partida: retrato com fita
 * MVP, nome/agente/rank, linha de stats e grade de micro-métricas.
 */

export interface MvpMetric {
  readonly label: string;
  readonly value: string;
}

export interface MvpCalloutProps {
  readonly playerName: string;
  readonly agent: string;
  readonly rank?: string;
  readonly stats?: readonly { readonly label: string; readonly value: string }[];
  readonly metrics: readonly MvpMetric[];
  readonly portraitSrc?: string;
  readonly className?: string;
}

export function MvpCallout({
  playerName,
  agent,
  rank,
  stats,
  metrics,
  portraitSrc,
  className,
}: MvpCalloutProps) {
  return (
    <section
      data-component="mvp-callout"
      className={cx(
        'flex flex-col justify-between gap-4 rounded-md border border-line bg-surface-raised p-4 md:flex-row md:items-center',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden bg-surface-hover">
          {portraitSrc !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element -- retrato remoto
            <img src={portraitSrc} alt="" className="size-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-full items-center justify-center font-hud text-heading-sm font-semibold text-text-secondary"
            >
              {agent.slice(0, 2).toUpperCase()}
            </span>
          )}
          <span className="absolute left-0 top-0 bg-accent px-1 font-hud text-label font-bold uppercase text-text-primary">
            MVP
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-heading-sm uppercase tracking-tight text-text-primary">
              {playerName}
            </h2>
            <span className="bg-surface-hover px-1.5 py-0.5 font-hud text-label uppercase text-text-primary">
              {agent}
            </span>
            {rank !== undefined ? (
              <span className="font-hud text-label uppercase text-text-secondary">{rank}</span>
            ) : null}
          </div>
          {stats !== undefined && stats.length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-body text-text-secondary">
              {stats.map((stat) => (
                <span key={stat.label}>
                  {stat.label}{' '}
                  <strong className="font-hud font-semibold text-text-primary">{stat.value}</strong>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      </div>

      <dl className="grid shrink-0 grid-cols-3 gap-3 bg-surface p-3" data-mvp-metrics>
        {metrics.map((metric) => (
          <div key={metric.label} className="px-1 text-center">
            <dt className="font-hud text-label uppercase text-text-secondary">{metric.label}</dt>
            <dd className="mt-1 font-hud text-heading-sm font-semibold text-text-primary">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
