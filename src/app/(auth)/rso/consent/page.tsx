import { Suspense } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SimulatedBadge } from '@/components/ui';
import { RSO_SCOPES, fictitiousAccountForUser, isRsoRegion } from '@/lib/rso/mock-provider';
import { getSessionFromHeaders } from '@/lib/session';
import { ConsentForm } from './consent-form';

/**
 * PÁGINA: /rso/consent — tela de consentimento do RSO SIMULADO (no RSO real
 * ela é do provedor). Sem logo/cores da Riot. `instant = false`: consome
 * `searchParams`; sessão e query só dentro do `<Suspense>`.
 */

export const instant = false;

export const metadata = { title: 'Riot Sign-On (simulado)' };

interface PageProps {
  searchParams: Promise<{ state?: string | string[]; region?: string | string[] }>;
}

export default function RsoConsentPage({ searchParams }: PageProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-display-xl-mobile uppercase text-text-primary">
          Riot Sign-On (simulado)
        </h1>
        <SimulatedBadge />
      </div>
      <Suspense fallback={<p className="text-body-md text-text-secondary">Carregando…</p>}>
        <Consent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Consent({ searchParams }: PageProps) {
  const resolvedHeaders = await headers();
  const { state, region } = await searchParams;
  if (typeof state !== 'string' || !state || !isRsoRegion(region)) {
    redirect('/dashboard/settings?rso=error');
  }
  let userId: string | null;
  try {
    userId = (await getSessionFromHeaders(resolvedHeaders))?.user.id ?? null;
  } catch (error) {
    console.error('[rso] falha ao ler a sessão no consentimento', error);
    redirect('/dashboard/settings?rso=error');
  }
  if (userId === null) {
    redirect(`/login?next=${encodeURIComponent(`/api/rso/authorize?region=${region}`)}`);
  }
  const account = fictitiousAccountForUser(userId, region);

  return (
    <div className="flex flex-col gap-4 border border-line bg-surface p-4">
      <p className="text-body-md text-text-secondary">
        O ValCoach pede acesso à sua conta Riot. Nesta simulação, a conta abaixo é fictícia e
        gerada para o seu usuário.
      </p>
      <p className="font-hud text-label-md text-text-primary">
        {`${account.gameName}#${account.tagLine}`}
      </p>
      <div>
        <p className="font-hud text-label-sm uppercase text-text-secondary">
          Escopos pedidos (escopos a confirmar)
        </p>
        <ul className="mt-1 list-inside list-disc text-body-md text-text-primary">
          {RSO_SCOPES.map((scope) => (
            <li key={scope}>
              <code>{scope}</code>
            </li>
          ))}
        </ul>
      </div>
      <ConsentForm state={state} region={region} />
    </div>
  );
}
