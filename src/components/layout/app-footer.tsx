import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * AppFooter — faixa de telemetria do rodapé (Stitch): protocolo à esquerda,
 * indicadores (latência/refresh/copyright) à direita.
 */

export interface AppFooterProps {
  readonly protocolText?: string;
  /** Itens de telemetria à direita (ex.: "LATÊNCIA: 12MS"). */
  readonly metrics?: readonly string[];
  readonly className?: string;
}

export function AppFooter({
  protocolText = 'VALCOACH // TELEMETRY • DADOS HENRKDEV',
  metrics,
  className,
}: AppFooterProps) {
  return (
    <footer
      data-component="app-footer"
      className={cx('w-full border-t border-line bg-surface-raised py-3', className)}
    >
      <div className="flex w-full flex-col items-center justify-between gap-2 px-4 font-hud text-label uppercase text-text-secondary md:flex-row md:px-6 xl:px-8">
        <span>{protocolText}</span>
        <span className="flex flex-wrap items-center gap-4" data-footer-metrics>
          {(metrics ?? []).map((metric) => (
            <span key={metric} className="text-text-primary">
              {metric}
            </span>
          ))}
          <span>Não afiliado à Riot Games</span>
        </span>
      </div>
    </footer>
  );
}
