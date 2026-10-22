/**
 * DeathHeatmap — grade pronta de `computeDeathHeatmap` sobre o minimapa
 * oficial. Escala sequencial de UM matiz (vermelho de derrota): opacidade
 * proporcional às mortes da célula sobre o máximo; célula sem morte fica
 * transparente. Só renderiza — a contagem por célula vem da análise.
 */

export interface DeathHeatmapProps {
  /** [linha v][coluna u] — grade quadrada de `computeDeathHeatmap`. */
  readonly grid: readonly (readonly number[])[];
  readonly mapName: string;
  readonly minimapSrc: string;
}

const MAX_OPACITY = 0.85;

export function DeathHeatmap({ grid, mapName, minimapSrc }: DeathHeatmapProps) {
  const size = grid.length;
  const counts = grid.flat();
  const max = Math.max(0, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const cell = 100 / size;

  return (
    <figure data-chart="death-heatmap" className="flex flex-col gap-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-line bg-surface-recessed">
        {/* eslint-disable-next-line @next/next/no-img-element -- minimapa estático local (1024²) */}
        <img src={minimapSrc} alt="" className="absolute inset-0 size-full object-contain" />
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Heatmap de ${total} mortes em ${mapName}`}
        >
          {grid.map((row, r) =>
            row.map((count, c) => (
              <rect
                key={`${r}-${c}`}
                data-cell={`${r}-${c}`}
                data-count={count}
                fillOpacity={max === 0 ? 0 : (MAX_OPACITY * count) / max}
                x={c * cell}
                y={r * cell}
                width={cell}
                height={cell}
                fill="var(--color-loss)"
              >
                {count > 0 ? <title>{`${count} ${count === 1 ? 'morte' : 'mortes'}`}</title> : null}
              </rect>
            )),
          )}
        </svg>
      </div>
      <figcaption className="flex items-center justify-between gap-3 font-hud text-label uppercase text-text-secondary">
        {total === 0 ? (
          <span>{`Nenhuma morte registrada em ${mapName}`}</span>
        ) : (
          <>
            <span>{`${total} mortes em ${mapName}`}</span>
            <span className="flex items-center gap-2" aria-hidden="true">
              0
              <span
                className="h-2 w-20 border border-line"
                style={{
                  background: `linear-gradient(to right, transparent, color-mix(in srgb, var(--color-loss) ${MAX_OPACITY * 100}%, transparent))`,
                }}
              />
              {max}
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
