'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';

/**
 * Botões de login social (Google/Discord) — Client Component.
 *
 * `signIn.social` redireciona o navegador para o provedor; o Better Auth
 * volta para `callbackURL` após o callback em /api/auth/callback/<provider>.
 * O `callbackPath` preserva o `?next=` do proxy (destino pós-login).
 */

type SocialProvider = 'google' | 'discord';

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: 'Continuar com Google',
  discord: 'Continuar com Discord',
};

export function SocialLoginButtons({ callbackPath }: { readonly callbackPath: string }) {
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
    <div data-social-login className="flex w-full flex-col gap-3">
      {(['google', 'discord'] as const).map((provider) => (
        <Button
          key={provider}
          type="button"
          variant={provider === 'google' ? 'primary' : 'secondary'}
          loading={loadingProvider === provider}
          disabled={loadingProvider !== null && loadingProvider !== provider}
          onClick={() => void signIn(provider)}
        >
          {PROVIDER_LABEL[provider]}
        </Button>
      ))}
      {error !== null ? (
        <p role="alert" className="text-body text-loss">
          {error}
        </p>
      ) : null}
    </div>
  );
}
