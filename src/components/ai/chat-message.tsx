import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * ChatMessage — mensagem do sandbox de chat com o coach IA: variantes
 * `ai` (avatar tinta, meta chips), `user` (avatar acento, alinhada à
 * direita) e `system` (pill centralizada).
 */

export interface ChatMessageMeta {
  readonly label: string;
  readonly tone?: 'neutral' | 'accent';
}

export interface ChatMessageProps {
  readonly variant: 'ai' | 'user' | 'system';
  readonly children: ReactNode;
  /** Cabeçalho da mensagem (remetente). Obrigatório exceto em `system`. */
  readonly sender?: string;
  readonly timestamp?: string;
  readonly meta?: readonly ChatMessageMeta[];
  /** Bloco opcional embutido (ex.: drill recomendado). */
  readonly embedded?: ReactNode;
  readonly className?: string;
}

export function ChatMessage({
  variant,
  children,
  sender,
  timestamp,
  meta,
  embedded,
  className,
}: ChatMessageProps) {
  if (variant === 'system') {
    return (
      <div className={cx('flex justify-center', className)} data-component="chat-message" data-variant="system">
        <span className="rounded-md bg-surface-hover px-2.5 py-1.5 font-hud text-label uppercase text-text-secondary">
          {children}
        </span>
      </div>
    );
  }

  const isAi = variant === 'ai';

  return (
    <div
      data-component="chat-message"
      data-variant={variant}
      className={cx(
        'flex max-w-[92%] items-start gap-2',
        isAi ? '' : 'max-w-[88%] self-end justify-end',
        className,
      )}
    >
      {isAi ? <ChatAvatar variant={variant}>{sender?.slice(0, 2).toUpperCase() ?? 'AI'}</ChatAvatar> : null}

      <div
        className={cx(
          'min-w-0 rounded-md p-3',
          isAi ? 'bg-surface' : 'bg-surface-hover text-right',
        )}
      >
        <header
          className={cx(
            'mb-1.5 flex items-center gap-3',
            isAi ? 'justify-between' : 'justify-end',
          )}
        >
          <span className="font-hud text-label font-bold uppercase text-text-primary">
            {sender}
          </span>
          {timestamp !== undefined ? (
            <span className="font-hud text-label uppercase text-text-secondary">{timestamp}</span>
          ) : null}
        </header>

        <div className="text-body leading-relaxed text-text-primary">{children}</div>

        {meta !== undefined && meta.length > 0 ? (
          <div className={cx('mt-2 flex items-center gap-1.5 border-t border-line pt-1.5', isAi ? '' : 'justify-end')}>
            {meta.map((item) => (
              <span
                key={item.label}
                className={cx(
                  'rounded-sm px-1.5 py-0.5 font-hud text-label uppercase',
                  item.tone === 'accent'
                    ? 'bg-accent font-bold text-text-primary'
                    : 'bg-surface-hover text-text-secondary',
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
        ) : null}

        {embedded !== undefined ? (
          <div className="mt-2 rounded-md bg-surface-raised p-2.5 text-left">{embedded}</div>
        ) : null}
      </div>

      {!isAi ? <ChatAvatar variant={variant}>{sender?.slice(0, 1).toUpperCase() ?? 'U'}</ChatAvatar> : null}
    </div>
  );
}

function ChatAvatar({
  variant,
  children,
}: {
  readonly variant: 'ai' | 'user';
  readonly children: ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'flex size-7 shrink-0 items-center justify-center rounded-md font-hud text-label font-bold',
        variant === 'ai' ? 'bg-text-primary text-surface' : 'bg-accent text-text-primary',
      )}
    >
      {children}
    </span>
  );
}
