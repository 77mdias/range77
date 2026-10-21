import Link from 'next/link';
import { AuthTabs } from './auth-tabs';
import { BrandLogo } from '@/components/layout/brand-logo';
import { Icon } from '@/components/ui/icon';
import { StatusDot } from '@/components/ui/status-dot';

/**
 * AuthHeader — chrome fixo das telas de auth (Stitch 7/8, byte-idêntico nos
 * dois arquivos exceto a aba ativa). Server Component; a única ilha client é
 * `AuthTabs`.
 */
export function AuthHeader() {
  return (
    <header
      data-auth-header
      className="fixed left-0 top-0 z-50 w-full border-b border-line bg-surface"
    >
      <div className="flex h-14 w-full items-center justify-between gap-2 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <BrandLogo />
          <span className="border border-line bg-surface-pressed px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            SYS_AUTH
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 border-l border-line pl-3 lg:flex">
            <span className="flex items-center gap-1.5 font-hud text-label-sm uppercase text-text-secondary">
              <StatusDot variant="live" className="border border-line" />
              RIOT API // SECURE V4
            </span>
            <span aria-hidden="true" className="font-hud text-label-sm text-text-secondary">
              |
            </span>
            <span className="font-hud text-label-sm uppercase text-text-secondary">
              SSL 256-BIT ENCRYPTION
            </span>
            <span
              aria-hidden="true"
              className="font-hud text-label-sm text-text-secondary"
            >
              |
            </span>
            <span className="flex items-center gap-1 border border-line bg-surface-raised px-1.5 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
              <Icon name="target" size="xs" />
              RTT &lt;15MS
            </span>
          </div>

          <AuthTabs />

          <div className="hidden flex-col text-right font-hud text-label-xs uppercase leading-tight sm:flex">
            <span className="text-text-primary">STATUS: READY</span>
            <span className="text-text-secondary">TELEMETRY ACTIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
