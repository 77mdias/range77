import { cx } from '@/lib/cx';

/**
 * AuthDivider — régua com rótulo central (Stitch: `OU ACESSE COM E-MAIL E
 * SENHA` / `--- OU PREENCHA O FORMULÁRIO DE REGISTRO ---`). Hairline preta
 * (doutrina do design system), não o cinza-fraco do arquivo.
 */
export interface AuthDividerProps {
  readonly label: string;
  readonly className?: string;
}

export function AuthDivider({ label, className }: AuthDividerProps) {
  return (
    <div data-auth-divider className={cx('flex items-center gap-2', className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="font-hud text-label-xs uppercase text-text-secondary">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
