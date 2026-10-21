'use client';

import { useEffect } from 'react';
import { saveRecentPlayerRank, type RecentPlayer } from '@/lib/recents/recent-players';

/**
 * RecentRankSync — ilha client SEM UI: ao abrir o perfil, grava o elo real
 * (rank + RR do tier) no histórico de recentes da home, para os cards de
 * "Perfis recentes buscados" mostrarem rank/RR. Só atualiza jogadores que já
 * estão no histórico (fail-soft, nunca lança).
 */

export interface RecentRankSyncProps {
  readonly riotId: string;
  /** Afinidade da rota (validada no módulo de recentes). */
  readonly region: string;
  readonly rank?: string;
  readonly rr?: number;
}

export function RecentRankSync({ riotId, region, rank, rr }: RecentRankSyncProps) {
  useEffect(() => {
    if (rank === undefined && rr === undefined) {
      return;
    }
    saveRecentPlayerRank({
      riotId,
      region: region as RecentPlayer['region'],
      ...(rank !== undefined ? { rank } : {}),
      ...(rr !== undefined ? { rr } : {}),
    });
  }, [riotId, region, rank, rr]);

  return null;
}
