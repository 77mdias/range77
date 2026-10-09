import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { getTrackedPlayersStore } from '@/lib/db/tracked-players-store';
import { getSession } from '@/lib/session';
import { UnfollowButton } from './unfollow-button';

/**
 * PÁGINA: /dashboard (protegida)
 *
 * Duas camadas de proteção: o proxy faz a checagem OPTIMISTA do cookie e
 * esta página valida a SESSÃO de verdade (`auth.api.getSession` via
 * `getSession()`); sem sessão → redirect /login. O conteúdo dinâmico fica
 * em <Suspense> (regra do Cache Components — o shell pré-renderiza vazio).
 */

export const instant = false;

function DashboardSkeleton() {
  return (
    <div data-dashboard-loading className="mx-auto w-full max-w-6xl px-4 py-10">
      <Skeleton height={72} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton height={140} />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </div>
    </div>
  );
}

/** Conteúdo dinâmico (sessão + store) — exportado para os testes. */
export async function DashboardContent() {
  const session = await getSession();
  if (session === null) {
    redirect('/login?next=%2Fdashboard');
  }

  const players = await getTrackedPlayersStore().listByUser(session.user.id);

  return (
    <div data-dashboard-page className="mx-auto w-full max-w-6xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-label uppercase text-accent">Dashboard</p>
          <h1 className="font-display text-display-md uppercase text-text-primary">
            Olá, {session.user.name}
          </h1>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary"
        >
          Configurações
        </Link>
      </header>

      {players.length === 0 ? (
        <EmptyState
          title="Nenhum jogador seguido"
          description="Abra o perfil de um jogador e clique em “Seguir” para acompanhá-lo aqui."
          action={
            <Link
              href="/"
              className="inline-flex h-10 items-center bg-accent px-6 font-hud text-label uppercase tracking-wide text-on-accent shadow-hard transition-all duration-[var(--duration-fast)] ease-out-expo hover:bg-accent-hover"
            >
              Buscar jogador
            </Link>
          }
        />
      ) : (
        <section
          aria-label="Jogadores seguidos"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {players.map((player) => (
            <Card key={player.id} label={player.region.toUpperCase()}>
              <div className="flex flex-col gap-4">
                <Link
                  href={`/players/${player.region}/${encodeURIComponent(player.nameKey)}/${player.tagKey}`}
                  className="font-display text-heading-lg uppercase text-text-primary no-underline transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-accent"
                >
                  {player.displayName}
                  <span className="text-text-secondary">#{player.tagKey}</span>
                </Link>
                <UnfollowButton region={player.region} name={player.nameKey} tag={player.tagKey} />
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main data-dashboard-page>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
