import Image from 'next/image';
import { cx } from '@/lib/cx';

/**
 * BrandLogo — marca dos headers (app e auth): escudo "77" da Range77 em
 * acento + wordmark `VALORANT.COACH` com assinatura `BY RANGE77` em HUD.
 * Só a apresentação: o `<Link>` para `/` fica com quem usa (cada header tem
 * o seu `aria-label`/estilo de foco). O escudo é decorativo (`alt=""`) — o
 * nome acessível vem do wordmark/do link.
 *
 * `compact` esconde o wordmark abaixo de `sm` (header do app, que divide a
 * barra com busca + perfil no mobile).
 */

export interface BrandLogoProps {
  readonly compact?: boolean;
  readonly className?: string;
}

export function BrandLogo({ compact = false, className }: BrandLogoProps) {
  return (
    <span data-brand-logo className={cx('group flex items-center gap-1.5', className)}>
      <Image
        src="/assets/images/brand/logo-accent.png"
        alt=""
        width={246}
        height={192}
        loading="eager"
        className="h-8 w-auto shrink-0 transition-transform duration-[var(--duration-fast)] group-hover:-rotate-3 group-hover:scale-105"
      />
      <span
        className={cx(
          'flex-col justify-center leading-none',
          compact ? 'hidden sm:flex' : 'flex',
        )}
      >
        <span className="font-display text-heading-sm uppercase leading-none tracking-tight text-text-primary">
          VALORANT<span className="text-text-secondary">.COACH</span>
        </span>
        <span className="mt-0.5 font-hud text-label-xs uppercase leading-none tracking-widest text-text-secondary">
          by Range77
        </span>
      </span>
    </span>
  );
}
