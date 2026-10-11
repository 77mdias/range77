import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { getCachedMatchDetail } from '@/lib/cache/tracker';
import { describeUpstreamError, mappedToApiErrorBody } from '@/lib/http/api-error';
import { parseMatchRouteParams } from '@/lib/validation/match-params';
import { MatchView } from './match-view';

/**
 * PÁGINA: /matches/[matchId]?region=xx
 *
 * O `match_id` é global, mas a HenrikDev exige a afinidade para rotear a
 * busca — ela chega via query string (`?region=`), com fallback para `br`.
 * Cache Data + cache durável (Neon) tornam visitas repetidas baratas.
 * Next 16: `params` e `searchParams` são Promises e DEVEM ser aguardadas.
 */

const DEFAULT_REGION = 'br';

// Cache Components: `params`/`searchParams` assíncronos → render bloqueante.
export const instant = false;

interface PageProps {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ region?: string | string[] }>;
}

function PageFrame({ children }: { readonly children: ReactNode }) {
  return <div className="w-full px-4 py-10 md:px-6 xl:px-8">{children}</div>;
}

function MatchSkeleton() {
  return (
    <div data-match-loading className="flex flex-col gap-4">
      <Skeleton height={72} />
      <Skeleton height={80} />
      <Skeleton height={200} />
    </div>
  );
}

async function MatchDetailData({
  region,
  matchId,
}: {
  readonly region: string;
  readonly matchId: string;
}) {
  try {
    const detail = await getCachedMatchDetail(region, matchId);
    return <MatchView detail={detail} />;
  } catch (error) {
    return (
      <ErrorState
        error={mappedToApiErrorBody(
          describeUpstreamError(error, {
            notFoundCode: 'MATCH_NOT_FOUND',
            notFoundMessage: 'Partida não encontrada na HenrikDev.',
            notFoundHint: 'Confira o match ID e a região da partida.',
          }),
        )}
      />
    );
  }
}

export default async function MatchPage({ params, searchParams }: PageProps) {
  const { matchId } = await params;
  const query = await searchParams;

  const region = typeof query.region === 'string' ? query.region : DEFAULT_REGION;
  const parsed = parseMatchRouteParams(region, matchId);
  if (!parsed.ok) {
    return (
      <PageFrame>
        <ErrorState error={{ error: { code: 'INVALID_PARAMS', message: parsed.message } }} />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <Suspense fallback={<MatchSkeleton />}>
        <MatchDetailData region={parsed.region} matchId={parsed.matchId} />
      </Suspense>
    </PageFrame>
  );
}
