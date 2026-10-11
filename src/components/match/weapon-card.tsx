import { ProgressBar } from '@/components/ui/progress-bar';
import { cx } from '@/lib/cx';

/**
 * WeaponCard — eficiência de arma do arsenal: nome, chip de abates, linhas
 * de stats e medidor de HS%.
 */

export interface WeaponStat {
  readonly label: string;
  readonly value: string;
  /** Destaca o valor em bold (padrão: sim). */
  readonly strong?: boolean;
}

export interface WeaponCardProps {
  readonly name: string;
  readonly kills: number;
  /** Arma primária ganha chip em acento; secundária fica neutra. */
  readonly primary?: boolean;
  readonly stats: readonly WeaponStat[];
  /** Percentual de HS (0–100) para o medidor; ausente → bloco omitido. */
  readonly hsPercentage?: number;
  readonly className?: string;
}

export function WeaponCard({
  name,
  kills,
  primary = true,
  stats,
  hsPercentage,
  className,
}: WeaponCardProps) {
  return (
    <article
      data-component="weapon-card"
      className={cx(
        'flex flex-col justify-between rounded-md border border-line bg-surface p-3',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-hud text-label font-bold uppercase text-text-primary">{name}</h3>
        <span
          data-weapon-kills
          className={cx(
            'px-1.5 font-hud text-label font-semibold',
            primary ? 'bg-accent text-text-primary' : 'bg-surface-hover text-text-secondary',
          )}
        >
          {kills} abates
        </span>
      </header>

      <dl className="mt-3 space-y-1 font-hud text-label">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center justify-between">
            <dt className="uppercase text-text-secondary">{stat.label}</dt>
            <dd
              className={stat.strong === false ? 'text-text-primary' : 'font-semibold text-text-primary'}
            >
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {hsPercentage !== undefined ? (
        <div className="mt-2.5">
          <ProgressBar
            value={hsPercentage}
            tone="ink"
            ariaLabel={`Headshot com ${name}: ${hsPercentage}%`}
          />
          <p className="mt-1 font-hud text-label uppercase text-text-secondary">
            HS {hsPercentage}%
          </p>
        </div>
      ) : null}
    </article>
  );
}
