import Link from 'next/link';
import { SignupForm } from '../login/email-auth-forms';

/**
 * PÁGINA: /signup
 *
 * Cadastro manual (nome + email + senha). Convive com os provedores
 * sociais: quem já tem conta Google/Discord usa o /login; o signup
 * cria credencial `credential` no Better Auth. Next 16: `await searchParams`.
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

export default async function SignupPage({ searchParams }: PageProps) {
  const query = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-20">
      <section data-signup-page className="flex flex-col gap-6 text-center">
        <p className="text-label uppercase text-text-secondary">Tracker · coach estatístico</p>
        <h1 className="font-display text-display-lg text-text-primary">
          Crie sua conta no <span className="bg-accent px-1.5 text-on-accent">ValCoach</span>
        </h1>
        <p className="text-body text-text-secondary">
          Cadastre-se com e-mail e senha para seguir jogadores e acompanhar a
          evolução no dashboard.
        </p>

        <SignupForm callbackPath={resolveCallbackPath(query.next)} />

        <p className="text-body text-text-secondary">
          Já tem conta?{' '}
          <Link
            href="/login"
            className="font-medium text-text-primary underline-offset-4 transition-colors duration-[var(--duration-fast)] ease-out-expo hover:underline"
          >
            Entrar
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
