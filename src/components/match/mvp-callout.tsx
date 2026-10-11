import { cx } from '@/lib/cx';

/**
 * MvpCallout — destaque do melhor jogador da partida (Stitch/match): retrato
 * com fita MVP, nome/agente/rank e a linha de identidade (Rating Global,
 * KDA com diff e First Kills) + micro-métricas (ACS/HS/KAST).
 */

export interface MvpMetric {
  readonly label: string;
  readonly value: string;
}

export interface MvpCalloutProps {
  readonly playerName: string;
  readonly agent: string;
  readonly rank?: string;
  /** Rating ValCoach computado (composto); ausente/`null` → `—`. */
  readonly rating?: number | null;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  /** Aberturas vencidas (FK); ausente/`null` → trecho omitido. */
  readonly firstKills?: number | null;
  /** Micro-métricas (ACS, HS RATE, KAST). */
  readonly metrics: readonly MvpMetric[];
  readonly portraitSrc?: string;
  readonly className?: string;
}

export function MvpCallout({
  playerName,
  agent,
  rank,
  rating,
  kills,
  deaths,
  assists,
  firstKills,
  metrics,
  portraitSrc,
  className,
}: MvpCalloutProps) {
  const kdDiff = kills - deaths;
  const diffLabel = kdDiff >= 0 ? `+${kdDiff}` : String(kdDiff);

  return (
    <section
      data-component="mvp-callout"
      className={cx(
        'flex flex-col justify-between gap-4 rounded-md border border-line bg-surface-raised p-4 md:flex-row md:items-center',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-line bg-surface-hover">
          {portraitSrc !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element -- retrato/ícone do agente
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
            <span className="border border-line bg-surface-hover px-1.5 py-0.5 font-hud text-label uppercase text-text-primary">
              {agent}
            </span>
            {rank !== undefined ? (
              <span className="font-hud text-label uppercase text-tertiary">{rank}</span>
            ) : null}
          </div>
          <p className="mt-1 flex flex-wrap gap-x-2 font-body-sm text-text-secondary">
            <span>
              Rating Global:{' '}
              <strong className="font-hud font-semibold text-text-primary">
                {rating === null || rating === undefined ? '—' : rating.toFixed(2)}
              </strong>
            </span>
            <span aria-hidden="true">•</span>
            <span>
              KDA:{' '}
              <strong className="font-hud font-semibold text-text-primary">
                {kills}/{deaths}/{assists}
              </strong>{' '}
              ({diffLabel} DIFF)
            </span>
            {firstKills !== null && firstKills !== undefined ? (
              <>
                <span aria-hidden="true">•</span>
                <span>
                  <strong className="font-hud font-semibold text-text-primary">{firstKills}</strong>{' '}
                  First Kills
                </span>
              </>
            ) : null}
          </p>
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
