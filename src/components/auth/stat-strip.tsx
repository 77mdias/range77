import { cx } from '@/lib/cx';

/**
 * StatStrip — linha de métricas mono do Stitch (Stitch: RTT LATENCY / PRO
 * MATCHES / AI CONFIDENCE). Números em `font-hud` (tabular-nums).
 */
export interface StatStripItem {
  readonly label: string;
  readonly value: string;
}

export interface StatStripProps {
  readonly items: readonly StatStripItem[];
  readonly className?: string;
}

export function StatStrip({ items, className }: StatStripProps) {
  return (
    <dl
      data-stat-strip
      className={cx(
        'grid grid-cols-3 divide-x divide-line border border-line bg-surface',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5 px-2 py-1.5">
          <dt className="font-hud text-label-xs uppercase text-text-secondary">{item.label}</dt>
          <dd className="font-hud text-headline-md text-text-primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
