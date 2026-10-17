'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { cx } from '@/lib/cx';

/**
 * SsoButtons — login/cadastro social (Google + Discord) com as marcas do
 * Stitch. Os paths são marcas de terceiros: não entram no `Icon` do design
 * system (que é monocromático e desenhado em viewBox 16).
 *
 * `signIn.social` navega o navegador para o provedor; o Better Auth volta para
 * `callbackPath` após o callback em /api/auth/callback/<provider>.
 */
type SocialProvider = 'google' | 'discord';

const DEFAULT_LABELS: Record<SocialProvider, string> = {
  google: 'Continuar com Google',
  discord: 'Continuar com Discord',
};

export interface SsoButtonsProps {
  readonly callbackPath: string;
  readonly labels?: Record<SocialProvider, string>;
  /** Badge à direita do botão do Discord (Stitch tela 7: `COMMUNITY`). */
  readonly discordBadge?: string;
  readonly className?: string;
}

function GoogleMark() {
  return (
    <svg data-brand="google" viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg
      data-brand="discord"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4 shrink-0 fill-[#5865F2]"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const BUTTON_CLASS = cx(
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5',
  'font-hud text-label-sm uppercase text-text-primary shadow-hard-1',
  'transition-[transform,box-shadow] duration-[var(--duration-fast)] ease-out-expo',
  'hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none',
  'disabled:cursor-not-allowed disabled:opacity-50',
);

export function SsoButtons({
  callbackPath,
  labels = DEFAULT_LABELS,
  discordBadge,
  className,
}: SsoButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: SocialProvider): Promise<void> {
    setLoadingProvider(provider);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.social({
        provider,
        callbackURL: callbackPath,
      });
      if (signInError !== null && signInError !== undefined) {
        setError('Não foi possível iniciar o login. Tente novamente.');
      }
    } catch {
      setError('Falha de rede ao contatar o servidor de autenticação.');
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div data-social-login className={cx('flex flex-col gap-2', className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(['google', 'discord'] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            aria-busy={loadingProvider === provider || undefined}
            disabled={loadingProvider !== null && loadingProvider !== provider}
            onClick={() => void signIn(provider)}
            className={BUTTON_CLASS}
          >
            {provider === 'google' ? <GoogleMark /> : <DiscordMark />}
            <span>{labels[provider]}</span>
            {provider === 'discord' && discordBadge !== undefined ? (
              <span className="border border-line bg-surface-pressed px-1 font-hud text-label-xs text-text-secondary">
                {discordBadge}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {error !== null ? (
        <p role="alert" className="text-body-sm text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
