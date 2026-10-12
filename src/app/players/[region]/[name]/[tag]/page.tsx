import { Suspense } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { getCachedPlayerOverview } from '@/lib/cache/tracker';
import { getTrackedPlayersStore } from '@/lib/db/tracked-players-store';
import {
  describeUpstreamError,
  hasErrorName,
  mappedToApiErrorBody,
} from '@/lib/http/api-error';
import { getSession } from '@/lib/session';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import { FollowButton } from './follow-button';
import { PlayerProfileView } from './profile-view';

/**
 * PÁGINA: /players/[region]/[name]/[tag]
 *
 * RSC-first: valida os parâmetros, resolve o cache Data e delega a
 * apresentação ao `PlayerProfileView`. O conteúdo dinâmico fica em
 * `<Suspense>` (regra do Cache Components). Erros viram `ErrorState` com o
 * envelope `ApiErrorBody` — nunca um crash. Next 16: `await params`.
 */

const PROFILE_SAMPLE_SIZE = 5;

// Cache Components: a página usa `params` assíncrono; optamos pelo render
// bloqueante (shell não pré-renderizado) para um perfil dinâmico por jogador.
export const instant = false;

interface PageProps {
  params: Promise<{ region: string; name: string; tag: string }>;
}

function PageFrame({ children }: { readonly children: ReactNode }) {
  return <div className="w-full px-4 py-10 md:px-6 xl:px-8">{children}</div>;
}

function ProfileSkeleton() {
  return (
    <div data-profile-loading className="flex flex-col gap-4">
      <Skeleton height={72} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton height={96} />
        <Skeleton height={96} />
        <Skeleton height={96} />
        <Skeleton height={96} />
      </div>
      <Skeleton height={200} />
    </div>
  );
}

/** Ação do header: "Seguir" (autenticado) ou convite ao login. */
async function FollowSection({
  region,
  name,
  tag,
}: {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
}): Promise<ReactNode> {
  const session = await getSession();
  if (session === null) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/players/${region}/${name}/${tag}`)}`}
        className="text-label uppercase text-text-secondary transition-colors duration-[var(--duration-fast)] ease-out-expo hover:text-text-primary"
      >
        Entrar para seguir
      </Link>
    );
  }

  const isTracked = await getTrackedPlayersStore().isTracked({
    userId: session.user.id,
    region,
    nameKey: name.toLowerCase(),
    tagKey: tag.toLowerCase(),
  });

  return <FollowButton region={region} name={name} tag={tag} initialFollowing={isTracked} />;
}

async function PlayerProfileData({
  region,
  name,
  tag,
}: {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
}) {
  try {
    const overview = await getCachedPlayerOverview(region, name, tag, PROFILE_SAMPLE_SIZE);
    const headerAction = await FollowSection({ region, name, tag });
    return <PlayerProfileView overview={overview} headerAction={headerAction} />;
  } catch (error) {
    if (hasErrorName(error, 'PlayerNoMatchesError')) {
      return (
        <ErrorState
          error={{
            error: {
              code: 'NO_VALID_MATCHES',
              message: error.message,
              hint: 'O jogador existe, mas não há partidas competitivas concluídas.',
            },
          }}
        />
      );
    }

    const mapped = describeUpstreamError(error, {
      notFoundCode: 'PLAYER_NOT_FOUND',
      notFoundMessage: 'Jogador não encontrado na HenrikDev.',
      notFoundHint: 'Confira o Riot ID (nome#tag) e a região da conta.',
    });
    // Diagnóstico no servidor (o ErrorState não vaza a causa ao cliente).
    console.error(
      `[players/[region]/[name]/[tag]] ${mapped.code} → HTTP ${mapped.status}` +
        (mapped.detail !== undefined ? ` | causa: ${mapped.detail}` : ''),
    );
    return <ErrorState error={mappedToApiErrorBody(mapped)} />;
  }
}

export default async function PlayerPage({ params }: PageProps) {
  const { region, name, tag } = await params;

  const parsed = parsePlayerRouteParams({ region, name, tag });
  if (!parsed.ok) {
    return (
      <PageFrame>
        <ErrorState error={{ error: { code: 'INVALID_PARAMS', message: parsed.message } }} />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Suspense fallback={<ProfileSkeleton />}>
        <PlayerProfileData region={parsed.region} name={parsed.name} tag={parsed.tag} />
      </Suspense>
    </PageFrame>
  );
}
