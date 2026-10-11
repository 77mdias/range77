import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { getCachedPlayerOverview } from '@/lib/cache/tracker';
import {
  describeUpstreamError,
  hasErrorName,
  mappedToApiErrorBody,
} from '@/lib/http/api-error';
import { parsePlayerRouteParams } from '@/lib/validation/player-params';
import { BreakdownView } from '../breakdown-view';

/**
 * PÁGINA: /players/[region]/[name]/[tag]/breakdown
 *
 * Tela "Partidas & Breakdown" do Stitch: filtros reais, matriz de agentes,
 * map pool e histórico completo. Usa a MESMA janela de dados do perfil,
 * porém com amostra maior (20 partidas) para as agregações por agente/mapa.
 * Cache Data + `<Suspense>` (regra do Cache Components). Next 16: `await`.
 */

const BREAKDOWN_SAMPLE_SIZE = 20;

// Cache Components: `params` assíncrono → render bloqueante.
export const instant = false;

interface PageProps {
  params: Promise<{ region: string; name: string; tag: string }>;
}

function PageFrame({ children }: { readonly children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-4 py-10">{children}</div>;
}

function BreakdownSkeleton() {
  return (
    <div data-breakdown-loading className="flex flex-col gap-4">
      <Skeleton height={48} />
      <Skeleton height={64} />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton height={200} />
        <Skeleton height={200} />
        <Skeleton height={200} />
      </div>
      <Skeleton height={240} />
    </div>
  );
}

async function BreakdownData({
  region,
  name,
  tag,
}: {
  readonly region: string;
  readonly name: string;
  readonly tag: string;
}) {
  try {
    const overview = await getCachedPlayerOverview(region, name, tag, BREAKDOWN_SAMPLE_SIZE);
    return <BreakdownView overview={overview} />;
  } catch (error) {
    if (hasErrorName(error, 'PlayerNoMatchesError')) {
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

    const mapped = describeUpstreamError(error, {
      notFoundCode: 'PLAYER_NOT_FOUND',
      notFoundMessage: 'Jogador não encontrado na HenrikDev.',
      notFoundHint: 'Confira o Riot ID (nome#tag) e a região da conta.',
    });
    console.error(
      `[players/[region]/[name]/[tag]/breakdown] ${mapped.code} → HTTP ${mapped.status}` +
        (mapped.detail !== undefined ? ` | causa: ${mapped.detail}` : ''),
    );
    return <ErrorState error={mappedToApiErrorBody(mapped)} />;
  }
}

export default async function BreakdownPage({ params }: PageProps) {
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
      <Suspense fallback={<BreakdownSkeleton />}>
        <BreakdownData region={parsed.region} name={parsed.name} tag={parsed.tag} />
      </Suspense>
    </PageFrame>
  );
}
