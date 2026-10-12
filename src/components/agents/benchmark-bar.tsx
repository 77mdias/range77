import { cx } from '@/lib/cx';

/**
 * BenchmarkBar — comparação jogador × referência do elo: chips de valores,
 * barra dupla (fill do jogador + marcador do elo) e escala inferior.
 */

export interface BenchmarkBarProps {
  readonly label: string;
  /** Valor do jogador (ex.: "1.34"). */
  readonly playerValue: string;
  /** Valor de referência do elo (ex.: "1.05"). */
  readonly eloValue: string;
  /** Posição do jogador na barra (0–100, calculado no analytics). */
  readonly playerPercent: number;
  /** Posição do marcador do elo (0–100). */
  readonly eloPercent: number;
  /** Jogador acima da referência → fill em acento; abaixo → tinta. */
  readonly above?: boolean;
  /** Pontos da escala (ex.: ["0.00", "1.05", "2.00"]). */
  readonly scale?: readonly string[];
  readonly className?: string;
}

export function BenchmarkBar({
  label,
  playerValue,
  eloValue,
  playerPercent,
  eloPercent,
  above = true,
  scale,
  className,
}: BenchmarkBarProps) {
  return (
    <div
      data-component="benchmark-bar"
      className={cx('flex flex-col gap-2 rounded-md bg-surface-raised p-3', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-hud text-label font-bold uppercase text-text-primary">{label}</span>
        <span className="flex items-center gap-2 font-hud text-label">
          <span
            data-benchmark-player
            className={cx(
              'rounded-sm px-1.5 py-0.5 font-bold',
              above ? 'bg-accent text-text-primary' : 'bg-loss/10 text-loss',
            )}
          >
            {playerValue} player
          </span>
          <span className="text-text-secondary">{eloValue} elo</span>
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-highest">
        {eloPercent >= 0 && eloPercent <= 100 ? (
          <span
            aria-hidden="true"
            data-testid="benchmark-elo"
            className="absolute inset-y-0 z-10 w-0.5 bg-text-primary"
            style={{ left: `${Math.min(100, Math.max(0, eloPercent))}%` }}
          />
        ) : null}
        <div
          aria-hidden="true"
          data-testid="benchmark-player"
          className={cx('h-full transition-all duration-[var(--duration-slow)]', above ? 'bg-accent' : 'bg-text-primary')}
          style={{ width: `${Math.min(100, Math.max(0, playerPercent))}%` }}
        />
      </div>

      {scale !== undefined && scale.length > 0 ? (
        <div className="flex items-center justify-between font-hud text-label uppercase text-text-secondary">
          {scale.map((point) => (
            <span key={point}>{point}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
