import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/states';
import { getCachedBreakdownOverview } from '@/lib/cache/tracker';
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
 * map pool e histórico completo. Usa a MESMA janela de dados do perfil, porém
 * com amostra dinâmica POR ATO (até 30 partidas, fallback 15 do ato anterior)
 * para as agregações por agente/mapa e o histórico. Cache Data + `<Suspense>`
 * (regra do Cache Components). Next 16: `await`.
 */

// Cache Components: `params` assíncrono → render bloqueante.
export const instant = false;

interface PageProps {
  params: Promise<{ region: string; name: string; tag: string }>;
}

function PageFrame({ children }: { readonly children: ReactNode }) {
  return <div className="w-full px-4 py-10 md:px-6 xl:px-8">{children}</div>;
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
    const overview = await getCachedBreakdownOverview(region, name, tag);
    return <BreakdownView overview={overview} />;
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
