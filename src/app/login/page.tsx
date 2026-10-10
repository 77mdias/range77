import Link from 'next/link';
import { EmailLoginForm } from './email-auth-forms';
import { SocialLoginButtons } from './social-login-buttons';

/**
 * PÁGINA: /login
 *
 * Login social (Google/Discord) E manual (email+senha). O proxy (Next 16)
 * redireciona rotas protegidas para cá com `?next=<destino>` — o destino é
 * repassado ao `callbackURL` do Better Auth. Next 16: `await searchParams`.
 */

export const instant = false;

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

function resolveCallbackPath(next: string | string[] | undefined): string {
  if (typeof next !== 'string' || !next.startsWith('/')) {
    return '/dashboard';
  }
  return next;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-20">
      <section data-login-page className="flex flex-col gap-6 text-center">
        <p className="text-label uppercase text-text-secondary">Tracker · coach estatístico</p>
        <h1 className="font-display text-display-lg text-text-primary">
          Entre no <span className="bg-accent px-1.5 text-on-accent">ValCoach</span>
        </h1>
        <p className="text-body text-text-secondary">
          Use e-mail e senha ou sua conta Google/Discord para seguir jogadores e
          acompanhar a evolução no dashboard.
        </p>

        <EmailLoginForm callbackPath={resolveCallbackPath(query.next)} />

        <SocialLoginButtons callbackPath={resolveCallbackPath(query.next)} />

        <p className="text-body text-text-secondary">
          Ainda não tem conta?{' '}
          <Link
            href="/signup"
            className="font-medium text-text-primary underline-offset-4 transition-colors duration-[var(--duration-fast)] ease-out-expo hover:underline"
          >
            Criar conta
          </Link>
        </p>

        <Link
          href="/"
          className="text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary"
        >
          Voltar para a home
        </Link>
      </section>
    </main>
  );
}
