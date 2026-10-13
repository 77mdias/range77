import { CoachingTip } from '@/components/ui/coaching-tip';
import { TagLabel } from '@/components/ui/tag-label';
import type { RrHistoryPoint } from '@/contracts/tracker';
import { cx } from '@/lib/cx';
import type { HistoryMetrics } from '@/services/analytics/match-history';

/**
 * MatchHistorySidebar — painel direito do "Histórico Completo" (Stitch):
 * diagnóstico do Coach IA (hooks REAIS de `coaching_hooks`) + mini-gráfico de
 * ΔRR da janela exibida + rodapé de telemetria. Sem backend de IA por partida:
 * só o que o motor 3-layer já produziu é renderizado.
 */

export interface MatchHistorySidebarProps {
  readonly coachingHooks: readonly string[];
  /** Pontos de RR da janela exibida (ordem cronológica). */
  readonly rrPoints: readonly RrHistoryPoint[];
  readonly metrics: HistoryMetrics;
}

const MAX_BARS = 6;

export function MatchHistorySidebar({ coachingHooks, rrPoints, metrics }: MatchHistorySidebarProps) {
  // Janela mais recente; o servidor entrega cronológico → fatiamos o fim.
  const bars = rrPoints.slice(-MAX_BARS);
  const maxAbs = bars.reduce((max, point) => Math.max(max, Math.abs(point.delta)), 0);

  return (
    <aside data-component="match-history-sidebar" className="flex flex-col gap-3">
      <div className="rounded-md border border-line bg-surface p-3 shadow-hard-2">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
          <span className="flex items-center gap-1.5 font-hud text-label font-bold uppercase text-text-primary">
            <span aria-hidden="true" className="size-2 rounded-full border border-line bg-accent" />
            Diagnóstico do Coach IA
          </span>
          <span className="font-hud text-label-xs uppercase text-text-secondary">Motor 3-layer</span>
        </div>

        {coachingHooks.length === 0 ? (
          <p className="mt-2 text-body-sm text-text-secondary">
            Nenhuma leitura de coaching disponível para a janela atual.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2" data-history-coaching-hooks>
            {coachingHooks.map((hook) => (
              <CoachingTip key={hook} title="Protocol advice">
                {hook}
              </CoachingTip>
            ))}
          </div>
        )}

        {bars.length > 0 ? (
          <div className="mt-3 border-t border-line pt-2">
            <div className="flex items-center justify-between font-hud text-label-xs uppercase">
              <span className="text-text-secondary">Tendência de ΔRR (janela)</span>
              <span className={cx('font-bold', metrics.netRr >= 0 ? 'text-accent-ink' : 'text-loss')}>
                {metrics.netRr >= 0 ? `+${metrics.netRr}` : metrics.netRr} RR NET
              </span>
            </div>
            <div className="mt-1 flex h-16 items-end justify-between gap-1 rounded-sm border border-line bg-surface-raised p-1">
              {bars.map((point) => {
                const positive = point.delta >= 0;
                const height = maxAbs === 0 ? 0 : Math.max(8, Math.round((Math.abs(point.delta) / maxAbs) * 100));
                return (
                  <div
                    key={point.matchId}
                    className="flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className={cx(
                        'w-full border border-line',
                        positive ? 'bg-accent' : 'bg-surface-highest',
                      )}
                      style={{ height: `${height}%` }}
                    />
                    <span
                      className={cx(
                        'mt-0.5 font-hud text-[8px]',
                        positive ? 'text-text-secondary' : 'text-loss',
                      )}
                    >
                      {positive ? `+${point.delta}` : point.delta}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-line bg-surface-raised px-3 py-2 text-center">
        <TagLabel withPrefix={false} className="text-label-xs">
          Registro telemétrico • {metrics.matches} partidas na janela
        </TagLabel>
      </div>
    </aside>
  );
}
