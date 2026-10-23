import Link from 'next/link';
import { cx } from '@/lib/cx';
import { RIOT_LEGAL_NOTICE } from '@/lib/legal';

/**
 * AuthFooter — rodapé das telas de auth. Estrutura do Stitch (build +
 * copyright + 3 links), com o aviso legal da Riot (`RIOT_LEGAL_NOTICE`, o mesmo
 * de `app-footer.tsx`) — o literal do Stitch ("RIOT GAMES AFFILIATE PROTOCOL")
 * afirmaria uma afiliação inexistente.
 */
const FOOTER_LINKS = [
  { href: '/termos', label: 'Termos de Serviço' },
  { href: '/privacidade', label: 'Privacidade & Telemetria' },
  { href: '#', label: 'Status do Sistema' },
] as const;

export interface AuthFooterProps {
  readonly buildLabel?: string;
  readonly className?: string;
}

const LINK_CLASS =
  'transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary';

export function AuthFooter({
  buildLabel = 'CONSOLE_BUILD: 2024.11.08-PROD',
  className,
}: AuthFooterProps) {
  return (
    <footer
      data-auth-footer
      className={cx('w-full border-t border-line bg-surface py-2.5', className)}
    >
      <div className="flex w-full flex-col items-center justify-between gap-1.5 px-4 font-hud text-label-xs uppercase text-text-secondary md:flex-row">
        <span className="flex items-center gap-2">
          <span>{buildLabel}</span>
          <span aria-hidden="true">//</span>
          <span>© 2024 VALCOACH TELEMETRY SYSTEMS.</span>
        </span>
        <span className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={LINK_CLASS}>
              {link.label}
            </Link>
          ))}
        </span>
      </div>
      <p data-riot-legal className="mt-1.5 px-4 text-center font-hud text-label-xs text-text-secondary">
        {RIOT_LEGAL_NOTICE}
      </p>
    </footer>
  );
}
