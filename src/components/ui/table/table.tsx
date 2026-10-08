import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { cx } from '@/lib/cx';

/**
 * Table — conjunto de primitivas densas (linhas de 40px), com header
 * sticky e células numéricas em `font-hud` alinhadas à direita.
 * Sem paginação embutida: a lista/orquestração decide isso fora.
 */

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  readonly children: ReactNode;
}

export function Table({ className, children, ...rest }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cx('w-full border-collapse text-left text-body', className)}
        {...rest}
      >
        {children}
      </table>
    </div>
  );
}

export type TableHeadProps = HTMLAttributes<HTMLTableSectionElement>;

export function TableHead({ className, children, ...rest }: TableHeadProps) {
  return (
    <thead className={cx('bg-surface-raised', className)} {...rest}>
      {children}
    </thead>
  );
}

export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;

export function TableBody({ className, children, ...rest }: TableBodyProps) {
  return (
    <tbody className={cx('divide-y divide-line', className)} {...rest}>
      {children}
    </tbody>
  );
}

export type TableRowProps = HTMLAttributes<HTMLTableRowElement>;

export function TableRow({ className, children, ...rest }: TableRowProps) {
  return (
    <tr
      className={cx(
        'h-10 transition-colors duration-[var(--duration-fast)] ease-out-expo hover:bg-surface-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Alinha à direita em `font-hud` (números). */
  readonly numeric?: boolean;
}

export function TableHeaderCell({
  numeric = false,
  className,
  children,
  ...rest
}: TableHeaderCellProps) {
  return (
    <th
      scope="col"
      className={cx(
        'sticky top-0 z-10 h-10 bg-surface-raised px-3 text-label uppercase text-text-secondary',
        numeric && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  /** Alinha à direita em `font-hud` (números). */
  readonly numeric?: boolean;
}

export function TableCell({ numeric = false, className, children, ...rest }: TableCellProps) {
  return (
    <td
      className={cx(
        'px-3 align-middle text-text-primary',
        numeric && 'text-right font-hud',
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  );
}
