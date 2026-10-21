import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, UpstreamErrorState } from '@/components/ui/states';
import { getCachedMatchDetail, getCachedPlayerCard } from '@/lib/cache/tracker';
import { describeUpstreamError, mappedToApiErrorBody } from '@/lib/http/api-error';
import { parseMatchRouteParams } from '@/lib/validation/match-params';
import { parseRiotId } from '@/lib/validation/riot-id';
import { selectMatchMvp } from '@/services/analytics/match-breakdown';
import { BackButton } from './back-button';
import { isSimulatedDataSource } from '@/services/tracker/sources';
import { MatchView, type MatchViewer } from './match-view';

/**
 * PÁGINA: /matches/[matchId]?region=xx&player=Nome%23Tag
 *
 * O `match_id` é global, mas a HenrikDev exige a afinidade para rotear a
 * busca — ela chega via query string (`?region=`), com fallback para `br`.
 * `player` (Riot ID do jogador buscado) habilita a perspectiva "VOCÊ"
 * (linha destacada, W/L e DEF/ATK do time dele). Cache Data + cache durável
 * (Neon) tornam visitas repetidas baratas. Next 16: `params` e `searchParams`
 * são Promises e DEVEM ser aguardadas.
 */

const DEFAULT_REGION = 'br';

// Cache Components: `params`/`searchParams` assíncronos → render bloqueante.
export const instant = false;

interface PageProps {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ region?: string | string[]; player?: string | string[] }>;
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

export async function MatchDetailData({
  region,
  matchId,
  viewer,
}: {
  readonly region: string;
  readonly matchId: string;
  readonly viewer: MatchViewer | null;
}) {
  const simulated = isSimulatedDataSource();
  try {
    // O jogador em foco (`?player=`) vai junto: a fonte simulada regenera a
    // partida a partir dele (fontes reais o ignoram).
    const detail = await getCachedMatchDetail(
      region,
      matchId,
      viewer === null ? undefined : { name: viewer.name, tag: viewer.tag },
    );
    const mvp = selectMatchMvp(detail.scoreboard);
    const mvpCardSrc =
      mvp === null || mvp.tag === '' ? null : await getCachedPlayerCard(mvp.name, mvp.tag);
    return (
      <MatchView
        detail={detail}
        viewer={viewer}
        mvpCardSrc={mvpCardSrc}
        simulated={simulated}
      />
    );
  } catch (error) {
    const mapped = describeUpstreamError(error, {
      notFoundCode: 'MATCH_NOT_FOUND',
      notFoundMessage: 'Partida não encontrada.',
      notFoundHint: 'Abra a partida pelo histórico do jogador (o link inclui o jogador) e confira a região.',
    });
    return (
      <UpstreamErrorState
        error={mappedToApiErrorBody(mapped)}
        retryAfterSeconds={mapped.retryAfterSeconds}
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

  // `player` (Riot ID) é opcional: sem ele a página segue neutra (sem "VOCÊ").
  const rawPlayer = typeof query.player === 'string' ? query.player : undefined;
  const parsedPlayer = rawPlayer === undefined ? null : parseRiotId(rawPlayer);
  const viewer: MatchViewer | null =
    parsedPlayer !== null && parsedPlayer.ok ? parsedPlayer.value : null;

  // Sem histórico no navegador, "Voltar" cai no perfil da perspectiva (ou home).
  const backHref =
    viewer === null
      ? '/'
      : `/players/${parsed.region}/${encodeURIComponent(viewer.name)}/${encodeURIComponent(viewer.tag)}`;

  return (
    <PageFrame>
      <div className="mb-4">
        <BackButton fallbackHref={backHref} label="Voltar" />
      </div>
      <Suspense fallback={<MatchSkeleton />}>
        <MatchDetailData region={parsed.region} matchId={parsed.matchId} viewer={viewer} />
      </Suspense>
    </PageFrame>
  );
}
