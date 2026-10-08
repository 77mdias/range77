import type { ElementType, ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * TÉCNICA — BORDA COM CLIP-PATH (o detalhe mais copiado errado):
 *
 * `clip-path` corta também as bordas nativas (`border`), então borda +
 * `chamfer-*` no MESMO elemento não funcionam. A borda é simulada com
 * dois elementos aninhados, ambos com o MESMO clip:
 *
 *   1. EXTERNO: `background: var(--color-line)` + `padding: 1px` — é esse
 *      filete de 1px que aparece como borda. Recebe o clip do tamanho.
 *   2. INTERNO: em FLUXO NORMAL (não absoluto!) para o externo manter a
 *      altura intrínseca do conteúdo; `background` da superfície + o
 *      mesmo clip. Por ser 2px menor (padding do externo), o corte
 *      diagonal fica alinhado.
 *
 * Regras de uso:
 *   - padding de conteúdo vai SEMPRE nos filhos (o `padding: 1px` do
 *     externo é estrutural e não deve ser sobrescrito);
 *   - para trocar a superfície do interno (ex.: card elevado), defina
 *     `--chamfer-inner-bg` no externo — ex.:
 *     `<ChamferBox bordered style={{ '--chamfer-inner-bg': 'var(--color-surface-raised)' }}>`.
 */

/** Tamanhos do corte do canto (tokens `--chamfer-*` do @theme). */
export type ChamferSize = 'sm' | 'md' | 'lg';

export interface ChamferBoxProps {
  /** Tamanho do chanfro. Padrão: `md`. */
  readonly size?: ChamferSize;
  /** Simula borda via técnica aninhada (externo = linha, interno = superfície). */
  readonly bordered?: boolean;
  /** Elemento renderizado (polimórfico). Padrão: `div`. */
  readonly as?: ElementType;
  readonly className?: string;
  readonly children?: ReactNode;
}

/** Container chanfrado — primitiva visual da assinatura do design system. */
export function ChamferBox({
  size = 'md',
  bordered = false,
  as,
  className,
  children,
}: ChamferBoxProps) {
  const Tag = as ?? 'div';
  const clip = `chamfer-${size}`;

  if (!bordered) {
    return <Tag className={cx(clip, className)}>{children}</Tag>;
  }

  return (
    <Tag className={cx(clip, 'chamfer-box-bordered', className)}>
      <div className={cx(clip, 'chamfer-box-inner')}>{children}</div>
    </Tag>
  );
}
