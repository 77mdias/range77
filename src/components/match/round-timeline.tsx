import { TagLabel } from '@/components/ui/tag-label';
import { cx } from '@/lib/cx';

/**
 * RoundTimeline — fita compacta de rounds (detalhe de partida): legenda
 * de estados e grade de células (nº, W/L por lado, economia, flag de IA).
 */

export type RoundOutcome = 'win' | 'win-defense' | 'win-attack' | 'loss';
export type RoundEconomy = 'eco' | 'buy' | 'full' | 'pistol';

export interface RoundCellData {
  readonly number: number;
  readonly outcome: RoundOutcome;
  readonly economy?: RoundEconomy;
  /** Round marcado com diagnóstico IA (`*`). */
  readonly flagged?: boolean;
}

export interface RoundTimelineProps {
  readonly rounds: readonly RoundCellData[];
  readonly ariaLabel?: string;
  readonly className?: string;
}

const OUTCOME_CLASSES: Record<RoundOutcome, string> = {
  win: 'bg-text-primary text-surface',
  'win-defense': 'bg-text-primary text-surface',
  'win-attack': 'bg-accent text-text-primary',
  loss: 'bg-line text-text-secondary',
};

const ECONOMY_LABEL: Record<RoundEconomy, string> = {
  eco: 'ECO',
  buy: 'BUY',
  full: 'FULL',
  pistol: 'PISTOL',
};

export function RoundTimeline({ rounds, ariaLabel = 'Timeline de rounds', className }: RoundTimelineProps) {
  if (rounds.length === 0) {
    return null;
  }

  return (
    <div
      data-component="round-timeline"
      className={cx('flex flex-col gap-2', className)}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        aria-hidden="true"
        className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-3 py-1.5 font-hud text-label uppercase text-text-secondary"
      >
        <span className="flex items-center gap-1.5">
          <span className="size-2 bg-text-primary" /> Vit. def
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 bg-accent" /> Vit. atk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 border border-line bg-line" /> Derrota
        </span>
        <span>
          <strong className="font-bold text-loss">*</strong> Diagnóstico IA
        </span>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <div
          className="flex min-w-max gap-1"
          style={{ gridAutoFlow: 'column', gridAutoColumns: 'min-content' }}
          data-round-track
        >
          {rounds.map((round) => (
            <div
              key={round.number}
              data-round={round.number}
              data-flagged={round.flagged ? '' : undefined}
              className={cx(
                'flex w-9 flex-col items-center rounded-sm border p-1 text-center',
                round.flagged ? 'border-loss' : 'border-line',
                'bg-surface',
              )}
            >
              <span className="font-hud text-[9px] font-bold uppercase text-text-secondary">
                R{round.number}
              </span>
              <span
                className={cx(
                  'my-0.5 w-full py-0.5 text-[10px] font-bold leading-none',
                  OUTCOME_CLASSES[round.outcome],
                )}
              >
                {round.outcome === 'loss' ? 'L' : 'W'}
              </span>
              {round.economy !== undefined ? (
                <span className="font-hud text-[9px] uppercase text-text-secondary">
                  {ECONOMY_LABEL[round.economy]}
                </span>
              ) : (
                <span className="font-hud text-[9px] text-transparent">—</span>
              )}
              {round.flagged ? (
                <span aria-hidden="true" className="text-[10px] font-bold leading-none text-loss">
                  *
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <TagLabel>
        {rounds.length} rounds • estado econômico &amp; combate
      </TagLabel>
    </div>
  );
}
