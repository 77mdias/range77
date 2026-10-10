import { ProgressBar, type ProgressBarTone } from '@/components/ui/progress-bar';
import { cx } from '@/lib/cx';

/**
 * MapCard — desempenho por mapa: imagem com scrim, chip de status, nome +
 * winrate sobre a imagem e rodapé com partidas, V-D e barras ATK/DEF.
 */

export type MapCardStatus = 'best' | 'stable' | 'neutral' | 'worst';

export interface MapCardProps {
  readonly map: string;
  readonly status: MapCardStatus;
  readonly statusLabel: string;
  readonly winRate: string;
  readonly matches: number;
  readonly record: { readonly wins: number; readonly losses: number };
  /** Sem dado de lado na partida: use `winPercent` (barra única de WR). */
  readonly attackPercent?: number;
  readonly defensePercent?: number;
  readonly winPercent?: number;
  readonly imageSrc?: string;
  readonly className?: string;
}

const STATUS_CHIP: Record<MapCardStatus, string> = {
  best: 'bg-accent text-text-primary',
  stable: 'bg-surface text-text-primary',
  neutral: 'bg-surface text-text-secondary',
  worst: 'bg-loss text-surface',
};

const BAR_TONE: Record<MapCardStatus, ProgressBarTone> = {
  best: 'accent',
  stable: 'ink',
  neutral: 'mute',
  worst: 'loss',
};

export function MapCard({
  map,
  status,
  statusLabel,
  winRate,
  matches,
  record,
  attackPercent,
  defensePercent,
  winPercent,
  imageSrc,
  className,
}: MapCardProps) {
  const hasSides = attackPercent !== undefined && defensePercent !== undefined;
  return (
    <article
      data-component="map-card"
      data-status={status}
      className={cx(
        'group flex flex-col justify-between overflow-hidden rounded-md border border-line bg-surface-raised transition-transform duration-[var(--duration-base)] ease-out-expo hover:-translate-y-1',
        status === 'worst' && 'ring-1 ring-loss/50',
        className,
      )}
    >
      <div className="relative h-28 w-full overflow-hidden bg-surface-hover">
        {imageSrc !== undefined ? (
          // eslint-disable-next-line @next/next/no-img-element -- splash remoto do mapa
          <img
            src={imageSrc}
            alt=""
            className="size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-105"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center font-display text-display-md uppercase text-text-secondary"
          >
            {map.slice(0, 2)}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
        />
        <span
          className={cx(
            'absolute left-2 top-2 rounded-sm px-1.5 py-0.5 font-hud text-label font-bold uppercase shadow-sm',
            STATUS_CHIP[status],
          )}
        >
          {statusLabel}
        </span>
        <div className="absolute inset-x-2 bottom-2 flex items-end justify-between">
          <h3 className="font-display text-heading-sm font-bold uppercase tracking-wider text-white">
            {map}
          </h3>
          <p
            className={cx(
              'font-hud text-heading-sm font-bold',
              status === 'best' && 'text-accent',
              status === 'worst' && 'text-loss',
              (status === 'stable' || status === 'neutral') && 'text-white',
            )}
          >
            {winRate}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 bg-surface-raised p-3">
        <div className="flex items-center justify-between font-hud text-label uppercase text-text-secondary">
          <span>Partidas: {matches}</span>
          <span className={cx('font-semibold', status === 'worst' && 'text-loss')}>
            <span className="text-text-primary">{record.wins}V</span> — {record.losses}D
          </span>
        </div>
        {hasSides ? (
          <>
            <ProgressBar value={attackPercent} tone={BAR_TONE[status]} ariaLabel={`Ataque em ${map}`} />
            <div className="flex items-center justify-between font-hud text-label uppercase text-text-secondary">
              <span>ATK {attackPercent}%</span>
              <span>DEF {defensePercent}%</span>
            </div>
            <ProgressBar value={defensePercent} tone={BAR_TONE[status]} ariaLabel={`Defesa em ${map}`} />
          </>
        ) : winPercent !== undefined ? (
          <>
            <ProgressBar value={winPercent} tone={BAR_TONE[status]} ariaLabel={`Win rate em ${map}`} />
            <p className="font-hud text-label uppercase text-text-secondary">WR {winPercent}%</p>
          </>
        ) : null}
      </div>
    </article>
  );
}
