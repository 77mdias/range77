'use client';

import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import { cx } from '@/lib/cx';

/**
 * ChatInputBar — barra de envio do chat IA: input transparente + botão
 * primário. A mensagem sobe via `onSend`; o histórico fica no pai.
 */

export interface ChatInputBarProps {
  readonly onSend: (message: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

export function ChatInputBar({
  onSend,
  placeholder = 'Pergunte sobre sua partida...',
  disabled = false,
  className,
}: ChatInputBarProps) {
  const [value, setValue] = useState('');
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed === '' || disabled) {
      return;
    }
    onSend(trimmed);
    setValue('');
  }

  return (
    <form
      data-component="chat-input-bar"
      onSubmit={handleSubmit}
      className={cx(
        'mt-3 flex items-center gap-2 rounded-md border border-line bg-surface p-1.5',
        className,
      )}
    >
      <label className="sr-only" htmlFor={inputId}>
        Mensagem para o coach IA
      </label>
      <input
        id={inputId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cx(
          'min-w-0 flex-1 bg-transparent px-2 py-1.5 text-body text-text-primary',
          'placeholder:text-text-secondary focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      />
      <button
        type="submit"
        disabled={disabled || value.trim() === ''}
        className={cx(
          'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5',
          'bg-accent font-hud text-label font-bold uppercase text-text-primary',
          'transition-colors duration-[var(--duration-fast)] hover:opacity-90',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        Enviar
        <Icon name="send" />
      </button>
    </form>
  );
}
