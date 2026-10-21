import type { SVGProps } from 'react';
import { cx } from '@/lib/cx';

/**
 * Icon — glifos inline (stroke 16px, sem dependência externa). O conjunto
 * cobre os usos do design system (Stitch): busca, alertas, IA, ações de
 * payload. Componente apenas de renderização (server-safe).
 */

export type IconName =
  | 'search'
  | 'bell'
  | 'terminal'
  | 'send'
  | 'check'
  | 'warning'
  | 'info'
  | 'copy'
  | 'refresh'
  | 'download'
  | 'shield'
  | 'bot'
  | 'arrow-left'
  | 'arrow-right'
  | 'filter'
  | 'chevron-down'
  | 'target'
  | 'grid'
  | 'history'
  | 'eye'
  | 'eye-off';

const PATHS: Record<IconName, React.ReactNode> = {
  search: (
    <>
      <circle cx={7} cy={7} r={4.5} />
      <path d="M10.5 10.5 14 14" />
    </>
  ),
  bell: <path d="M8 2a4 4 0 0 0-4 4v3l-1.5 2.5h11L12 9V6a4 4 0 0 0-4-4ZM6.5 13.5a1.5 1.5 0 0 0 3 0" />,
  terminal: (
    <>
      <rect x={1.5} y={2.5} width={13} height={11} rx={1} />
      <path d="m4.5 6 2 2-2 2M8.5 10.5h3" />
    </>
  ),
  send: <path d="M14 2 7.5 8.5M14 2 9.5 14l-2-5.5L2 6.5 14 2Z" />,
  check: <path d="m2.5 8.5 3.5 3.5 7-8" />,
  warning: (
    <>
      <path d="M8 2 15 14H1L8 2Z" />
      <path d="M8 6.5v3.5M8 12.4v.1" />
    </>
  ),
  info: (
    <>
      <circle cx={8} cy={8} r={6.5} />
      <path d="M8 7.5v4M8 5v.1" />
    </>
  ),
  copy: (
    <>
      <rect x={5.5} y={5.5} width={8.5} height={8.5} rx={1} />
      <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
    </>
  ),
  refresh: (
    <>
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5V6H10" />
    </>
  ),
  download: <path d="M8 2v8m0 0 3-3m-3 3-3-3M2.5 13.5h11" />,
  shield: <path d="M8 1.5 13.5 4v4.5c0 3-2.5 5-5.5 6-3-1-5.5-3-5.5-6V4L8 1.5Z" />,
  bot: (
    <>
      <rect x={3} y={5} width={10} height={8} rx={1.5} />
      <path d="M8 5V2.5M5.5 9v.1M10.5 9v.1M5.5 11h5" />
    </>
  ),
  'arrow-left': <path d="M14 8H3m0 0 4-4M3 8l4 4" />,
  'arrow-right': <path d="M2 8h11m0 0-4-4m4 4-4 4" />,
  filter: <path d="M2 3.5h12l-4.5 5v4l-3 1.5v-5.5L2 3.5Z" />,
  'chevron-down': <path d="m3.5 6 4.5 4.5L12.5 6" />,
  target: (
    <>
      <circle cx={8} cy={8} r={6} />
      <circle cx={8} cy={8} r={2.5} />
    </>
  ),
  grid: (
    <>
      <rect x={2.5} y={2.5} width={4.5} height={4.5} rx={0.5} />
      <rect x={9} y={2.5} width={4.5} height={4.5} rx={0.5} />
      <rect x={2.5} y={9} width={4.5} height={4.5} rx={0.5} />
      <rect x={9} y={9} width={4.5} height={4.5} rx={0.5} />
    </>
  ),
  history: (
    <>
      <path d="M8 4.5V8l2.5 1.5" />
      <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
      <path d="M2.5 2.5V6H6" />
    </>
  ),
  eye: (
    <>
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" />
      <circle cx={8} cy={8} r={2} />
    </>
  ),
  'eye-off': (
    <>
      <path d="M6.2 3.8A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a12 12 0 0 1-1.9 2.4M4 5.2A12.5 12.5 0 0 0 1.5 8S4 12.5 8 12.5c.7 0 1.3-.1 1.9-.3" />
      <path d="M2.5 2.5l11 11" />
    </>
  ),
};

export type IconSize = 'xs' | 'sm' | 'md';

const SIZE_CLASSES: Record<IconSize, string> = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  readonly name: IconName;
  readonly size?: IconSize;
}

export function Icon({ name, size = 'sm', className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-icon={name}
      className={cx('inline-block shrink-0', SIZE_CLASSES[size], className)}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
