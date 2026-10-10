'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';
import { tokenizeJson, type JsonTokenKind } from './highlight';

/**
 * CodeViewer — inspetor de payload JSON (console): titlebar com "traffic
 * lights", código com highlight e action bar (copiar/exportar/simular).
 */

export interface CodeViewerAction {
  readonly label: string;
  readonly onSelect: () => void;
  readonly icon?: 'copy' | 'download' | 'refresh';
  readonly variant?: 'ghost' | 'primary';
}

export interface CodeViewerProps {
  readonly filename: string;
  readonly code: string;
  /** Badge do titlebar (ex.: "UTF-8 • JSON VALID"). */
  readonly badge?: string;
  readonly actions?: readonly CodeViewerAction[];
  readonly maxHeight?: number;
  readonly className?: string;
}

const TOKEN_CLASSES: Record<JsonTokenKind, string> = {
  key: 'font-semibold text-text-primary',
  string: 'text-text-secondary',
  number: 'text-win',
  literal: 'font-bold text-loss',
  plain: 'text-text-primary',
};

export function CodeViewer({
  filename,
  code,
  badge = 'UTF-8 • JSON válido',
  actions,
  maxHeight = 380,
  className,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const tokens = tokenizeJson(code);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível (permissão/ambiente): ignora silenciosamente.
    }
  }

  return (
    <div
      data-component="code-viewer"
      className={cx('relative flex flex-col rounded-md bg-surface-hover p-3', className)}
    >
      <header className="mb-2 flex items-center justify-between gap-3 rounded-sm bg-line px-2.5 py-1.5">
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-loss" />
            <span className="size-2 rounded-full bg-accent" />
            <span className="size-2 rounded-full bg-win" />
          </span>
          <span
            data-code-filename
            className="truncate font-hud text-label uppercase text-text-primary"
          >
            {filename}
          </span>
        </span>
        <span className="shrink-0 font-hud text-label uppercase text-text-secondary">{badge}</span>
      </header>

      <div
        className="flex-1 overflow-y-auto pr-1"
        style={{ maxHeight }}
        data-testid="code-scroll"
        tabIndex={0}
      >
        <pre className="whitespace-pre font-hud text-label leading-relaxed">
          <code data-code-content>
            {tokens.map((token, index) => (
              <span key={index} className={TOKEN_CLASSES[token.kind]}>
                {token.text}
              </span>
            ))}
          </code>
        </pre>
      </div>

      {actions !== undefined && actions.length > 0 ? (
        <footer className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {actions.map((action) => {
              const isCopy = action.icon === 'copy';
              const label = isCopy && copied ? 'Copiado!' : action.label;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={async () => {
                    if (isCopy) {
                      await handleCopy();
                    }
                    action.onSelect();
                  }}
                  className={cx(
                    'flex cursor-pointer items-center gap-1.5 rounded-sm px-2.5 py-1.5',
                    'font-hud text-label uppercase transition-colors duration-[var(--duration-fast)]',
                    action.variant === 'primary'
                      ? 'bg-accent font-bold text-text-primary hover:opacity-90'
                      : 'border border-line bg-surface text-text-primary hover:bg-surface-raised',
                  )}
                >
                  {action.icon !== undefined ? <Icon name={action.icon} /> : null}
                  {label}
                </button>
              );
            })}
          </div>
        </footer>
      ) : null}
    </div>
  );
}
