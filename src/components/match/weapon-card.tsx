import { ProgressBar } from '@/components/ui/progress-bar';
import { cx } from '@/lib/cx';

/**
 * WeaponCard — eficiência de arma do arsenal: nome, chip de abates, linhas
 * de stats e um medidor opcional (ex.: share de abates, HS%).
 */

export interface WeaponStat {
  readonly label: string;
  readonly value: string;
  /** Destaca o valor em bold (padrão: sim). */
  readonly strong?: boolean;
}

/** Medidor de base 0–100 exibido sob as estatísticas. */
export interface WeaponMeter {
  readonly value: number;
  readonly label: string;
}

export interface WeaponCardProps {
  readonly name: string;
  readonly kills: number;
  /** Arma primária ganha chip em acento; secundária fica neutra. */
  readonly primary?: boolean;
  readonly stats: readonly WeaponStat[];
  /** Medidor de proporção (0–100); ausente → bloco omitido. */
  readonly meter?: WeaponMeter;
  readonly className?: string;
}

export function WeaponCard({
  name,
  kills,
  primary = true,
  stats,
  meter,
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

      {meter === undefined ? null : (
        <div className="mt-2.5">
          <ProgressBar
            value={meter.value}
            tone="ink"
            ariaLabel={`${name}: ${meter.label}`}
          />
          <p className="mt-1 font-hud text-label uppercase text-text-secondary">{meter.label}</p>
        </div>
      )}
    </article>
  );
}
