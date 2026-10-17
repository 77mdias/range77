import Link from 'next/link';
import { cx } from '@/lib/cx';

/**
 * AuthFooter — rodapé das telas de auth. Estrutura do Stitch (build +
 * copyright + 3 links), com a redação de NÃO-afiliação que o app já publica
 * em `app-footer.tsx` — o literal do Stitch ("RIOT GAMES AFFILIATE PROTOCOL")
 * afirmaria uma afiliação inexistente.
 *
 * TODO(rotas-publicas): Termos de Serviço, Privacidade & Telemetria e Status
 * do Sistema não existem como rotas (spec §10). `#` até existirem.
 */
const FOOTER_LINKS = [
  { href: '#', label: 'Termos de Serviço' },
  { href: '#', label: 'Privacidade & Telemetria' },
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
          <span>Não afiliado à Riot Games.</span>
        </span>
        <span className="flex flex-wrap items-center gap-4">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className={LINK_CLASS}>
              {link.label}
            </Link>
          ))}
        </span>
      </div>
    </footer>
  );
}
