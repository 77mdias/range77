'use client';

import { useId, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * AiQueryForm — consulta ao motor de IA (overview/console): textarea com
 * atalho Ctrl+Enter, meta de tokens e painel de resposta controlado pelo
 * pai (`response` + `loading`).
 */

export interface AiQueryFormProps {
  readonly model: string;
  /** Meta exibida à direita do header (ex.: "PROMPT TOKEN: 4.2k"). */
  readonly tokenMeta?: string;
  readonly placeholder?: string;
  readonly submitLabel?: string;
  readonly loading?: boolean;
  /** Resposta pronta para exibição (painel). */
  readonly response?: ReactNode;
  /** Meta da resposta (ex.: "LATÊNCIA: 180MS"). */
  readonly responseMeta?: string;
  readonly onSubmit: (prompt: string) => void;
  readonly className?: string;
}

export function AiQueryForm({
  model,
  tokenMeta,
  placeholder = 'Pergunte algo sobre o desempenho...',
  submitLabel = 'Enviar consulta',
  loading = false,
  response,
  responseMeta,
  onSubmit,
  className,
}: AiQueryFormProps) {
  const [prompt, setPrompt] = useState('');
  const textareaId = useId();

  function submit(): void {
    const trimmed = prompt.trim();
    if (trimmed === '' || loading) {
      return;
    }
    onSubmit(trimmed);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      data-component="ai-query-form"
      onSubmit={handleSubmit}
      className={cx('flex flex-col', className)}
    >
      <div className="mb-1.5 flex items-center justify-between font-hud text-label uppercase">
        <span className="flex items-center gap-1.5 text-text-secondary">
          <Icon name="terminal" />
          Consultar IA
        </span>
        {tokenMeta !== undefined ? (
          <span className="text-text-secondary">{tokenMeta}</span>
        ) : null}
      </div>

      <div className="relative">
        <label className="sr-only" htmlFor={textareaId}>
          Consulta para a IA
        </label>
        <textarea
          id={textareaId}
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cx(
            'w-full resize-none rounded-md border border-line bg-surface p-2.5',
            'text-body text-text-primary placeholder:text-text-secondary',
            'focus:outline-none focus:ring-1 focus:ring-text-primary',
          )}
        />
        <kbd className="absolute bottom-2 right-2 rounded-sm border border-line bg-surface-hover px-1.5 py-0.5 font-hud text-label uppercase text-text-secondary">
          Ctrl+Enter
        </kbd>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-hud text-label uppercase text-text-secondary">
          Model: <strong className="text-text-primary">{model}</strong>
        </span>
        <Button type="submit" size="sm" loading={loading}>
          {submitLabel}
          <Icon name="send" />
        </Button>
      </div>

      {response !== undefined ? (
        <div
          data-ai-response
          aria-live="polite"
          className="mt-2 rounded-md border border-line bg-surface p-2.5"
        >
          <header className="mb-1.5 flex items-center justify-between gap-2 border-b border-line pb-1.5 font-hud text-label uppercase">
            <span className="font-bold text-text-primary">Resposta do motor</span>
            {responseMeta !== undefined ? (
              <span className="text-win">{responseMeta}</span>
            ) : null}
          </header>
          <div
            className={cx(
              'text-body',
              loading && 'italic text-text-secondary',
            )}
          >
            {response}
          </div>
        </div>
      ) : null}
    </form>
  );
}
