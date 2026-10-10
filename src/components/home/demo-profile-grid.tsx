import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * DemoProfileGrid — perfis demo catalogados do hero: card-botão por
 * perfil (nome + chip de região, rank • RR). Perfil destacado usa acento.
 */

export interface DemoProfile {
  /** Riot ID completo (ex.: "NEXUS#BR1"). */
  readonly riotId: string;
  readonly regionChip: string;
  readonly rank: string;
  /** RR formatado (ex.: "78 RR"). */
  readonly rr: string;
  readonly highlighted?: boolean;
}

export interface DemoProfileGridProps {
  readonly profiles: readonly DemoProfile[];
  readonly onSelect?: (profile: DemoProfile) => void;
  readonly label?: string;
  readonly className?: string;
}

export function DemoProfileGrid({
  profiles,
  onSelect,
  label = 'Perfis demo catalogados',
  className,
}: DemoProfileGridProps) {
  return (
    <div
      data-component="demo-profile-grid"
      className={cx('w-full', className)}
    >
      <p className="mb-1.5 flex items-center justify-center gap-1.5 font-hud text-label uppercase text-text-secondary">
        <Icon name="target" />
        {label}
      </p>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {profiles.map((profile) => (
          <li key={profile.riotId}>
            <button
              type="button"
              data-demo-profile={profile.riotId}
              data-highlighted={profile.highlighted ? '' : undefined}
              onClick={onSelect !== undefined ? () => onSelect(profile) : undefined}
              className={cx(
                'w-full cursor-pointer rounded-md border p-2 text-left transition-colors duration-[var(--duration-fast)]',
                profile.highlighted === true
                  ? 'border-transparent bg-accent text-text-primary'
                  : 'border-line bg-surface-raised hover:bg-surface-hover',
              )}
            >
              <span className="flex items-center justify-between gap-1.5">
                <span className="truncate font-hud text-label font-bold uppercase text-text-primary">
                  {profile.riotId}
                </span>
                <span
                  className={cx(
                    'shrink-0 px-1 font-hud text-[9px] font-bold uppercase leading-tight',
                    profile.highlighted === true
                      ? 'bg-surface text-text-primary'
                      : 'bg-surface-hover text-text-secondary',
                  )}
                >
                  {profile.regionChip}
                </span>
              </span>
              <span className="mt-0.5 flex items-center justify-between font-hud text-label uppercase text-text-secondary">
                <span>{profile.rank}</span>
                <span className={cx('font-semibold', profile.highlighted ? 'text-text-primary' : 'text-text-primary')}>
                  {profile.rr}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
