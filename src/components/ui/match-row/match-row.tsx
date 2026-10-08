import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cx } from '@/lib/cx';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * MatchRow — linha de partida do histórico: mapa (display), Badge W/L,
 * K/D/A, ACS, HS% e data relativa. Com `href`, a linha inteira é um link
 * para o detalhe da partida (fase 2).
 */

export type MatchResult = 'win' | 'loss';

export interface MatchRowProps {
  readonly map: string;
  readonly result: MatchResult;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly acs: number;
  readonly hsPercentage?: number;
  readonly playedAt: string | Date;
  readonly href?: string;
  /** Injetável para testes determinísticos de tempo relativo. */
  readonly now?: Date | number;
  readonly className?: string;
}

export function MatchRow({
  map,
  result,
  kills,
  deaths,
  assists,
  acs,
  hsPercentage,
  playedAt,
  href,
  now,
  className,
}: MatchRowProps) {
  const win = result === 'win';
  const relative = formatRelativeTime(playedAt, now);

  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-heading-sm uppercase text-text-primary">{map}</p>
        <time className="text-body text-text-secondary">{relative}</time>
      </div>

      <Badge variant={win ? 'win' : 'loss'}>{win ? 'W' : 'L'}</Badge>

      <dl className="flex shrink-0 items-center gap-4 text-right">
        <div className="w-20">
          <dt className="sr-only">K/D/A</dt>
          <dd className="font-hud text-body-lg text-text-primary">
            {kills}/{deaths}/{assists}
          </dd>
        </div>
        <div className="w-16">
          <dt className="text-label uppercase text-text-secondary">ACS</dt>
          <dd className="font-hud text-body-lg text-text-primary">{acs}</dd>
        </div>
        {hsPercentage !== undefined ? (
          <div className="w-12">
            <dt className="text-label uppercase text-text-secondary">HS</dt>
            <dd className="font-hud text-body-lg text-text-primary">{hsPercentage}%</dd>
          </div>
        ) : null}
      </dl>
    </>
  );

  const classes = cx(
    'flex items-center gap-4 px-4 py-3',
    'transition-colors duration-[var(--duration-fast)] ease-out-expo',
    'hover:bg-surface-hover',
    className,
  );

  if (href === undefined) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <Link href={href} className={cx(classes, 'no-underline')} data-match-row>
      {content}
    </Link>
  );
}
