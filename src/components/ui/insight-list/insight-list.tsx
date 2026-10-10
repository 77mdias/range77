import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * InsightList — lista de pontos fortes (tone=strength) ou críticos
 * (tone=weakness) computados pelo analytics: itens em superfície com
 * título `//` e descrição.
 */

export type InsightTone = 'strength' | 'weakness';

export interface InsightItem {
  readonly title: string;
  readonly description: string;
}

export interface InsightListProps {
  readonly tone: InsightTone;
  /** Rótulo do header do bloco (ex.: "PONTOS FORTES COMPUTADOS"). */
  readonly label: string;
  readonly items: readonly InsightItem[];
  readonly className?: string;
}

const TONE_CLASSES: Record<InsightTone, { chip: string; title: string; icon: 'check' | 'warning' }> =
  {
    strength: {
      chip: 'bg-surface-hover text-text-primary',
      title: 'text-win',
      icon: 'check',
    },
    weakness: {
      chip: 'bg-loss/10 text-loss',
      title: 'text-loss',
      icon: 'warning',
    },
  };

export function InsightList({ tone, label, items, className }: InsightListProps) {
  const classes = TONE_CLASSES[tone];

  return (
    <div
      data-component="insight-list"
      data-tone={tone}
      className={cx('flex flex-col gap-2', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cx(
            'inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1',
            'font-hud text-label font-bold uppercase',
            classes.chip,
          )}
        >
          <Icon name={classes.icon} />
          {label}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-md border border-line bg-surface p-2.5"
          >
            <p
              className={cx(
                'font-hud text-label font-bold uppercase',
                classes.title,
              )}
            >
              <span aria-hidden="true" className="text-text-secondary">
                //&nbsp;
              </span>
              {item.title}
            </p>
            <p className="mt-1 text-body text-text-primary">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
