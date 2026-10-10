import { Icon } from '@/components/ui/icon';
import { ProgressBar, type ProgressBarTone } from '@/components/ui/progress-bar';
import { cx } from '@/lib/cx';

/**
 * AgentCard — card bento de agente: barra de tier no topo, retrato com
 * tag de papel, badge de tier, winrate, grade de stats com delta e
 * linhas de progresso + status tático.
 */

export type AgentTier = 'main' | 'solid' | 'bottleneck';

export interface AgentStat {
  readonly label: string;
  readonly value: string;
  /** Delta da métrica; sinal define a cor. */
  readonly delta?: number;
}

export interface AgentProgress {
  readonly label: string;
  /** Percentual 0–100 (calculado no analytics). */
  readonly percent: number;
  readonly displayValue: string;
}

export interface AgentCardProps {
  readonly name: string;
  /** Função do agente (Duelista etc.) — ausente em payloads sem role. */
  readonly role?: string;
  readonly matches: number;
  readonly winRate: string;
  readonly tier: AgentTier;
  readonly tierLabel: string;
  readonly portraitSrc?: string;
  readonly stats: readonly AgentStat[];
  readonly progresses: readonly AgentProgress[];
  /** Nota tática do coach IA. */
  readonly tacticalNote: {
    readonly tone: 'positive' | 'neutral' | 'warning';
    readonly title: string;
    readonly description: string;
  };
  readonly className?: string;
}

const TIER_ACCENT: Record<AgentTier, string> = {
  main: 'bg-accent',
  solid: 'bg-line',
  bottleneck: 'bg-loss',
};

const TIER_BADGE: Record<AgentTier, string> = {
  main: 'bg-accent text-text-primary',
  solid: 'bg-surface-hover text-text-secondary',
  bottleneck: 'bg-loss/10 text-loss',
};

const TACTICAL_ICON = {
  positive: 'check',
  neutral: 'check',
  warning: 'warning',
} as const;

const ROLE_ABBREV: Record<string, string> = {
  Duelista: 'DUE',
  Controlador: 'CTR',
  Iniciador: 'INI',
  Sentinela: 'SEN',
};

export function AgentCard({
  name,
  role,
  matches,
  winRate,
  tier,
  tierLabel,
  portraitSrc,
  stats,
  progresses,
  tacticalNote,
  className,
}: AgentCardProps) {
  const bottleneck = tier === 'bottleneck';

  return (
    <article
      data-component="agent-card"
      data-tier={tier}
      className={cx(
        'relative flex flex-col justify-between overflow-hidden rounded-md border border-line bg-surface p-4',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx('absolute inset-x-0 top-0 h-1', TIER_ACCENT[tier])}
      />

      <header className="flex items-start justify-between gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-hover">
          {portraitSrc !== undefined ? (
            // eslint-disable-next-line @next/next/no-img-element -- retrato remoto do agente
            <img src={portraitSrc} alt="" className="size-full object-cover" />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-full items-center justify-center font-hud text-heading-sm font-semibold text-text-secondary"
            >
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
          {role !== undefined ? (
            <span className="absolute bottom-0 right-0 bg-text-primary px-1 font-hud text-[9px] uppercase leading-tight text-surface">
              {ROLE_ABBREV[role] ?? role.slice(0, 3).toUpperCase()}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-heading-sm font-bold uppercase tracking-tight text-text-primary">
              {name}
            </h3>
            <span
              className={cx(
                'rounded-sm px-1.5 py-0.5 font-hud text-label font-bold uppercase',
                TIER_BADGE[tier],
              )}
            >
              {tierLabel}
            </span>
          </div>
          <p className="mt-0.5 font-hud text-label uppercase text-text-secondary">
            {role !== undefined ? `${role} • ` : ''}
            {matches} partidas
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className={cx('font-hud text-heading-sm font-bold', bottleneck && 'text-loss')}>
            {winRate}
          </p>
          <p className="font-hud text-label uppercase text-text-secondary">Win rate</p>
        </div>
      </header>

      <dl className="my-3 grid grid-cols-3 gap-2 rounded-md bg-surface-raised px-3 py-2">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="font-hud text-label uppercase text-text-secondary">{stat.label}</dt>
            <dd className="font-hud text-heading-sm font-bold text-text-primary">{stat.value}</dd>
            {stat.delta !== undefined ? (
              <p
                data-stat-delta={stat.delta >= 0 ? 'up' : 'down'}
                className={cx(
                  'font-hud text-label font-semibold',
                  stat.delta > 0 ? 'text-win' : stat.delta < 0 ? 'text-loss' : 'text-text-secondary',
                )}
              >
                {stat.delta > 0 ? '▲' : stat.delta < 0 ? '▼' : '—'} {Math.abs(stat.delta)}
              </p>
            ) : null}
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        {progresses.map((progress) => (
          <div key={progress.label}>
            <div className="flex items-center justify-between font-hud text-label uppercase text-text-secondary">
              <span>{progress.label}</span>
              <span className={cx('font-semibold', bottleneck ? 'text-loss' : 'text-text-primary')}>
                {progress.displayValue}
              </span>
            </div>
            <ProgressBar
              value={progress.percent}
              tone={bottleneck ? 'loss' : 'accent'}
              ariaLabel={`${progress.label}: ${progress.displayValue}`}
              className="mt-1"
            />
          </div>
        ))}
      </div>

      <footer
        data-tactical-note
        className={cx(
          'mt-3 flex items-start gap-2 rounded-md p-2.5',
          tacticalNote.tone === 'warning' ? 'bg-loss/5' : 'bg-surface-raised',
        )}
      >
        <Icon
          name={TACTICAL_ICON[tacticalNote.tone]}
          className={cx('mt-0.5', tacticalNote.tone === 'warning' && 'text-loss')}
        />
        <div className="min-w-0">
          <p
            className={cx(
              'font-hud text-label font-bold uppercase',
              tacticalNote.tone === 'warning' ? 'text-loss' : 'text-text-primary',
            )}
          >
            {tacticalNote.title}
          </p>
          <p className="mt-0.5 text-body leading-snug text-text-primary">
            {tacticalNote.description}
          </p>
        </div>
      </footer>
    </article>
  );
}
