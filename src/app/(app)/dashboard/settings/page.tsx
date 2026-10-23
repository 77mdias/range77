import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HENRIKDEV_AFFINITIES } from '@/contracts/henrikdev';
import { getUserRiotStore } from '@/lib/db/user-riot-store';
import { getSession } from '@/lib/session';
import { LogoutButton } from './logout-button';
import { ProfilePublicToggle } from './profile-public-toggle';
import { UnlinkRiotButton } from './unlink-riot-button';

/**
 * PÁGINA: /dashboard/settings (protegida)
 *
 * Perfil do usuário (nome/avatar/email do provedor social) + conta Riot
 * (vínculo SÓ via RSO simulado, perfil público, desvincular) + logout.
 * Conteúdo dinâmico em <Suspense> (Cache Components); sem sessão → /login.
 * `?rso=linked|denied|error` vem do callback/consentimento do RSO.
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

type SearchParams = Promise<{ rso?: string | string[] }>;

const RSO_MESSAGES: Record<string, { readonly text: string; readonly ok: boolean }> = {
  linked: { text: 'Conta Riot conectada.', ok: true },
  denied: { text: 'Autorização negada. Nada foi gravado.', ok: false },
  error: { text: 'Não foi possível conectar a conta Riot. Tente novamente.', ok: false },
};

/** Início do RSO simulado: GET nativo (sem JS) para o authorize. */
function ConnectRiotForm() {
  return (
    <form action="/api/rso/authorize" method="get" className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-label uppercase text-text-secondary">
        Região
        <select
          name="region"
          defaultValue="br"
          className="rounded-md border border-line bg-surface px-2 py-1.5 font-hud text-text-primary"
        >
          {HENRIKDEV_AFFINITIES.map((affinity) => (
            <option key={affinity} value={affinity}>
              {affinity.toUpperCase()}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm">
        Entrar com Riot
      </Button>
    </form>
  );
}

/** Conteúdo dinâmico (sessão) — exportado para os testes. */
export async function SettingsContent({ searchParams }: { searchParams: SearchParams }) {
  const { rso } = await searchParams;
  const rsoStatus = typeof rso === 'string' && Object.hasOwn(RSO_MESSAGES, rso) ? RSO_MESSAGES[rso] : undefined;

  const session = await getSession();
  if (session === null) {
    redirect('/login?next=%2Fdashboard%2Fsettings');
  }

  const linked = await getUserRiotStore().get(session.user.id);
  const rsoLinked = linked !== null && linked.linkedVia !== 'legacy' ? linked : null;

  return (
    <div data-settings-page className="mx-auto w-full max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-3 border-b border-line pb-4">
        <h1 className="font-display text-display-md text-text-primary">Configurações</h1>
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
              className="h-16 w-16 rounded-md border border-line object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-md border border-line bg-surface-hover font-display text-heading-lg text-text-secondary"
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

      <Card label="Conta Riot" className="mt-6">
        {rsoStatus !== undefined ? (
          <p
            data-rso-status
            role={rsoStatus.ok ? 'status' : 'alert'}
            className={`mb-4 text-body ${rsoStatus.ok ? 'text-text-primary' : 'text-loss'}`}
          >
            {rsoStatus.text}
          </p>
        ) : null}
        {rsoLinked !== null ? (
          <div data-riot-linked className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label uppercase text-text-secondary">
                  {rsoLinked.region.toUpperCase()}
                </p>
                <p className="font-display text-heading-lg text-text-primary">
                  {rsoLinked.displayName}
                  <span className="text-text-secondary">#{rsoLinked.tagKey}</span>
                </p>
              </div>
              <UnlinkRiotButton />
            </div>
            <ProfilePublicToggle initialValue={rsoLinked.profilePublic} />
          </div>
        ) : (
          <div data-riot-empty className="flex flex-col gap-3">
            <p className="text-body text-text-secondary">
              {linked !== null
                ? 'Reconecte com Riot: o Riot ID digitado antes não vale como autorização.'
                : 'Conecte sua conta Riot para acompanhar sua própria evolução.'}
            </p>
            <ConnectRiotForm />
          </div>
        )}
      </Card>

      <div className="mt-6 flex justify-end">
        <LogoutButton />
      </div>
    </div>
  );
}

export default function SettingsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main data-settings-page>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
