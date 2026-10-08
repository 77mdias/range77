import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { getCachedPlayerOverview } from '@/lib/cache/tracker';
import { describeUpstreamError, mappedToApiErrorBody } from '@/lib/http/api-error';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import { PlayerNoMatchesError } from '@/services/coaching/player-combat';
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
  return <div className="mx-auto w-full max-w-6xl px-4 py-10">{children}</div>;
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
    return <PlayerProfileView overview={overview} />;
  } catch (error) {
    if (error instanceof PlayerNoMatchesError) {
      return (
        <ErrorState
          error={{
            error: {
              code: 'NO_VALID_MATCHES',
              message: error.message,
              hint: 'O jogador existe, mas não há partidas competitivas concluídas recentes.',
            },
          }}
        />
      );
    }
    return (
      <ErrorState
        error={mappedToApiErrorBody(
          describeUpstreamError(error, {
            notFoundCode: 'PLAYER_NOT_FOUND',
            notFoundMessage: 'Jogador não encontrado na HenrikDev.',
            notFoundHint: 'Confira o Riot ID (nome#tag) e a região da conta.',
          }),
        )}
      />
    );
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
