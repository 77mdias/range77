import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserRiotStore } from '@/lib/db/user-riot-store';
import { getSession } from '@/lib/session';
import { LinkRiotForm } from './link-riot-form';
import { LogoutButton } from './logout-button';
import { UnlinkRiotButton } from './unlink-riot-button';

/**
 * PÁGINA: /dashboard/settings (protegida)
 *
 * Perfil do usuário (nome/avatar/email do provedor social) + Riot ID
 * vinculado (self-tracking) + logout. Conteúdo dinâmico em <Suspense>
 * (Cache Components); sem sessão → /login.
 */

export const instant = false;

function SettingsSkeleton() {
  return (
    <div data-settings-loading className="mx-auto w-full max-w-2xl px-4 py-10">
      <Skeleton height={56} />
      <Skeleton height={160} />
    </div>
  );
}

/** Conteúdo dinâmico (sessão) — exportado para os testes. */
export async function SettingsContent() {
  const session = await getSession();
  if (session === null) {
    redirect('/login?next=%2Fdashboard%2Fsettings');
  }

  const linked = await getUserRiotStore().get(session.user.id);

  return (
    <div data-settings-page className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-3 border-b border-line pb-4">
        <h1 className="font-display text-display-md uppercase text-text-primary">Configurações</h1>
        <Link
          href="/dashboard"
          className="text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary"
        >
          ← Dashboard
        </Link>
      </header>

      <Card label="Perfil">
        <div className="flex items-center gap-4">
          {session.user.image !== null ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar do provedor (URL externa dinâmica)
            <img
              src={session.user.image}
              alt={`Avatar de ${session.user.name}`}
              width={64}
              height={64}
              className="h-16 w-16 border border-line object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center border border-line bg-surface-hover font-display text-heading-lg text-text-secondary"
            >
              {session.user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <dl className="flex flex-col gap-1 text-body">
            <div className="flex gap-2">
              <dt className="text-text-secondary">Nome</dt>
              <dd className="font-hud font-semibold text-text-primary">{session.user.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-text-secondary">Email</dt>
              <dd className="text-text-primary">{session.user.email ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card label="Riot ID" className="mt-6">
        {linked !== null ? (
          <div data-riot-linked className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label uppercase text-text-secondary">
                  {linked.region.toUpperCase()}
                </p>
                <p className="font-display text-heading-lg uppercase text-text-primary">
                  {linked.displayName}
                  <span className="text-text-secondary">#{linked.tagKey}</span>
                </p>
              </div>
              <UnlinkRiotButton />
            </div>
          </div>
        ) : (
          <div data-riot-empty className="flex flex-col gap-3">
            <p className="text-body text-text-secondary">
              Vincule seu Riot ID para acompanhar sua própria evolução.
            </p>
            <LinkRiotForm />
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-end">
        <LogoutButton />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <main data-settings-page>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </main>
  );
}
