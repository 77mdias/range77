import { cx } from '@/lib/cx';

/**
 * RoundTimeline — fita compacta de rounds (Stitch/match "PLACAR DE ROUNDS"):
 * header com a contagem, legenda de lado, células (nº, W/L colorido por lado,
 * tipo de encerramento e chip de pistola), separador do 2º half, progressão
 * de placar e resumo agregado. Componente PURO: recebe dados já classificados
 * por `services/analytics` e apenas renderiza.
 */

export type RoundTimelineKind = 'elim' | 'plant' | 'defuse' | 'retake' | 'time';
export type RoundTimelineSide = 'attack' | 'defense';

export interface RoundCellData {
  readonly number: number;
  readonly won: boolean;
  /** Lado do time de referência; `null`/ausente → cor neutra de vitória. */
  readonly side?: RoundTimelineSide | null;
  /** Tipo de encerramento do round; ausente → `—`. */
  readonly kind?: RoundTimelineKind | null;
  /** 1º round de cada half (pistola) → chip "PIST". */
  readonly pistol?: boolean;
  /** Placar acumulado após o round (ex.: "7-5"); ausente → não exibe. */
  readonly score?: string;
}

export interface RoundSummaryData {
  readonly roundsWon: number;
  readonly roundsLost: number;
  readonly roundsTotal: number;
  /** % de rounds vencidos (0–100); sem rounds → `null`. */
  readonly winPercent: number | null;
  readonly pistol: {
    readonly won: number;
    readonly played: number;
    /** % de pistolas convertidas (0–100); sem pistola → `null`. */
    readonly percent: number | null;
  };
}

export interface RoundTimelineProps {
  readonly rounds: readonly RoundCellData[];
  readonly summary?: RoundSummaryData;
  readonly ariaLabel?: string;
  readonly className?: string;
}

const KIND_LABEL: Record<RoundTimelineKind, string> = {
  elim: 'ELIM',
  plant: 'PLNT',
  defuse: 'DEFU',
  retake: 'RETK',
  time: 'TIME',
};

/** 13 = 1º round do 2º half regulamentar (referência do separador). */
const SECOND_HALF_FIRST_ROUND = 13;

function winTone(won: boolean, side: RoundTimelineSide | null | undefined): string {
  if (!won) {
    return 'bg-surface-highest text-text-secondary';
  }
  return side === 'attack' ? 'bg-accent text-text-primary' : 'bg-text-primary text-surface';
}

/** Borda base + realce do 1º round do 2º half (sem conflito de borda). */
function cellBorder(number: number): string {
  return number === SECOND_HALF_FIRST_ROUND
    ? 'border-y border-r border-line border-l-2 border-l-text-primary'
    : 'border border-line';
}

function marginForHalf(number: number): string {
  return number === SECOND_HALF_FIRST_ROUND ? 'ml-1.5' : '';
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="font-hud text-label-xs uppercase text-text-secondary">{label}</dt>
      <dd className="mt-1 font-display text-headline-md text-text-primary">{value}</dd>
    </div>
  );
}

export function RoundTimeline({
  rounds,
  summary,
  ariaLabel = 'Timeline de rounds',
  className,
}: RoundTimelineProps) {
  if (rounds.length === 0) {
    return null;
  }

  return (
    <div
      data-component="round-timeline"
      className={cx('flex flex-col gap-3', className)}
      role="group"
      aria-label={ariaLabel}
    >
      <header className="flex flex-col gap-2 border-b border-line pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-hud text-label font-bold uppercase text-text-primary">
            {`// Timeline de ${rounds.length} rounds • estado de combate`}
          </span>
          <span className="bg-surface-hover px-1.5 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            Compact ribbon
          </span>
        </div>
        <div
          aria-hidden="true"
          className="flex flex-wrap items-center gap-3 font-hud text-label-xs uppercase text-text-secondary"
        >
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 bg-text-primary" /> Vitória def
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 bg-accent" /> Vitória atk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 border border-line bg-surface-highest" /> Derrota
          </span>
        </div>
      </header>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max flex-col gap-1" data-round-track>
          <div className="flex items-stretch gap-1">
            {rounds.map((round) => (
              <div
                key={round.number}
                data-round={round.number}
                data-round-result={round.won ? 'win' : 'loss'}
                className={cx(
                  'flex w-10 shrink-0 flex-col items-center bg-surface p-1 text-center',
                  cellBorder(round.number),
                  marginForHalf(round.number),
                )}
              >
                <span className="font-hud text-[9px] font-bold uppercase text-text-secondary">
                  R{round.number}
                </span>
                <span
                  className={cx(
                    'my-0.5 w-full py-0.5 font-hud text-[10px] font-bold leading-none',
                    winTone(round.won, round.side),
                  )}
                >
                  {round.won ? 'W' : 'L'}
                </span>
                <span className="font-hud text-[8px] uppercase text-text-secondary">
                  {round.kind == null ? '—' : KIND_LABEL[round.kind]}
                </span>
                <span
                  className={cx(
                    'mt-0.5 w-full px-0.5 font-hud text-[8px] uppercase',
                    round.pistol === true
                      ? 'bg-accent text-text-primary font-bold'
                      : 'text-transparent',
                  )}
                >
                  {round.pistol === true ? 'PIST' : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-stretch gap-1 border-t border-line pt-1">
            {rounds.map((round) => (
              <span
                key={round.number}
                className={cx(
                  'w-10 shrink-0 text-center font-hud text-[9px] text-text-secondary',
                  marginForHalf(round.number),
                )}
              >
                {round.score ?? ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      {summary === undefined ? null : (
        <dl className="grid grid-cols-2 gap-3 border border-line bg-surface p-3 sm:grid-cols-4">
          <Metric
            label="Conversão pistols"
            value={
              summary.pistol.played === 0
                ? '—'
                : `${summary.pistol.won} / ${summary.pistol.played} (${summary.pistol.percent ?? 0}%)`
            }
          />
          <Metric label="Rounds ganhos" value={`${summary.roundsWon} / ${summary.roundsTotal}`} />
          <Metric label="Rounds perdidos" value={`${summary.roundsLost}`} />
          <Metric
            label="Aproveitamento"
            value={summary.winPercent === null ? '—' : `${summary.winPercent}%`}
          />
        </dl>
      )}
    </div>
  );
}
