import { Badge } from '@/components/ui/badge';
import { cx } from '@/lib/cx';

/**
 * ScoreBanner — resultado final da partida: placar em display, badge W/L,
 * halves (DEF/ATK) e thumbnail do mapa com caption.
 */

export interface ScoreBannerProps {
  /** Perspectiva do placar (time da casa). Omitido = neutro, sem badge. */
  readonly result?: 'win' | 'loss';
  readonly scoreTeam: number;
  readonly scoreEnemy: number;
  readonly map: string;
  /** Placar por half (ex.: "DEF: 7-5 • ATK: 6-4"). */
  readonly halves?: string;
  readonly mapImageSrc?: string;
  readonly className?: string;
}

export function ScoreBanner({
  result,
  scoreTeam,
  scoreEnemy,
  map,
  halves,
  mapImageSrc,
  className,
}: ScoreBannerProps) {
  const win = result === 'win';
  const hasPerspective = result !== undefined;

  return (
    <section
      data-component="score-banner"
      className={cx(
        'flex items-center justify-between gap-4 rounded-md border border-line bg-surface-raised p-4',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-hud text-label uppercase tracking-widest text-text-secondary">
          <span aria-hidden="true">//&nbsp;</span>Resultado final
        </p>
        <p className="mt-1 flex items-baseline gap-3">
          <span
            className={cx(
              'font-display text-display-lg leading-none',
              hasPerspective && !win ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {scoreTeam}
          </span>
          <span aria-hidden="true" className="font-display text-heading-lg text-text-secondary">
            :
          </span>
          <span
            className={cx(
              'font-display text-display-lg leading-none',
              hasPerspective && win ? 'text-text-secondary' : 'text-text-primary',
            )}
          >
            {scoreEnemy}
          </span>
          {result !== undefined ? (
            <Badge variant={win ? 'win' : 'loss'} className="ml-1">
              {win ? 'Vitória' : 'Derrota'}
            </Badge>
          ) : null}
        </p>
        {halves !== undefined ? (
          <p className="mt-1.5 font-hud text-label uppercase text-text-secondary">{halves}</p>
        ) : null}
      </div>

      <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-surface-hover">
        {mapImageSrc !== undefined ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnail remoto do mapa
          <img src={mapImageSrc} alt="" className="size-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-full items-center justify-center font-hud text-label uppercase text-text-secondary"
          >
            {map.slice(0, 3)}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-text-primary/80 py-1 text-center font-hud text-label uppercase text-surface">
          {map}
        </span>
      </div>
    </section>
  );
}
