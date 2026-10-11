import type { KillEvent, MatchScoreboardRow } from '@/contracts/tracker';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: agregações puras do detalhe de partida.
 * ======================================================================
 *
 * Funções determinísticas sobre `KillEvent[]` / `MatchScoreboardRow[]`.
 * Rigor estatístico: nada é fabricado — first bloods e kills por arma saem
 * exclusivamente dos eventos normalizados; campos que a HenrikDev não fornece
 * (KAST, ECON rating) NÃO são calculados aqui.
 */

/** FK/FD de um jogador (contagem). */
export interface PlayerFirstBloods {
  readonly firstBloods: number;
  readonly firstDeaths: number;
}

/** Tabela de first bloods indexada por puuid. */
export type FirstBloodTable = ReadonlyMap<string, PlayerFirstBloods>;

/** Kills agregadas por arma, com share sobre o total computável. */
export interface WeaponKillStat {
  readonly weapon: string;
  readonly kills: number;
  /** % (0–100, 1 casa) sobre o total de kills com arma conhecida. */
  readonly sharePercent: number;
}

/** Totais agregados de um time na partida. */
export interface TeamTotals {
  readonly teamId: string;
  readonly players: number;
  readonly totalDamage: number;
  readonly totalKills: number;
  readonly totalDeaths: number;
  readonly totalAssists: number;
}

/** `a` ocorreu antes de `b` (match-time; time-in-round como desempate). */
function isEarlierKill(a: KillEvent, b: KillEvent): boolean {
  if (a.timeInMatchMs !== b.timeInMatchMs) {
    return a.timeInMatchMs < b.timeInMatchMs;
  }
  return (a.timeInRoundMs ?? Number.POSITIVE_INFINITY) <
    (b.timeInRoundMs ?? Number.POSITIVE_INFINITY);
}

/**
 * Conta FK/FD por puuid a partir do PRIMEIRO abate de cada round. Puuids
 * vazios (eventos sem autor/vítima resolvidos) não entram na tabela.
 */
export function computeFirstBloods(kills: readonly KillEvent[]): FirstBloodTable {
  const firstByRound = new Map<number, KillEvent>();
  for (const kill of kills) {
    const current = firstByRound.get(kill.roundNumber);
    if (current === undefined || isEarlierKill(kill, current)) {
      firstByRound.set(kill.roundNumber, kill);
    }
  }

  const table = new Map<string, { firstBloods: number; firstDeaths: number }>();
  const bump = (puuid: string, key: 'firstBloods' | 'firstDeaths'): void => {
    if (puuid === '') {
      return;
    }
    const entry = table.get(puuid) ?? { firstBloods: 0, firstDeaths: 0 };
    entry[key] += 1;
    table.set(puuid, entry);
  };

  for (const kill of firstByRound.values()) {
    bump(kill.killerPuuid, 'firstBloods');
    bump(kill.victimPuuid, 'firstDeaths');
  }

  return table;
}

/**
 * Agrega kills por arma (match inteiro ou de um jogador via `killerPuuid`).
 * Armas desconhecidas (`null`/vazio) são excluídas. Ordena por kills desc e,
 * em empate, por nome asc.
 */
export function aggregateWeaponKills(
  kills: readonly KillEvent[],
  killerPuuid?: string,
): readonly WeaponKillStat[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const kill of kills) {
    if (killerPuuid !== undefined && kill.killerPuuid !== killerPuuid) {
      continue;
    }
    if (kill.weapon === null || kill.weapon === '') {
      continue;
    }
    counts.set(kill.weapon, (counts.get(kill.weapon) ?? 0) + 1);
    total += 1;
  }

  return [...counts.entries()]
    .map(([weapon, count]) => ({
      weapon,
      kills: count,
      sharePercent: roundTo((count / total) * 100, 1),
    }))
    .sort((a, b) => (b.kills === a.kills ? a.weapon.localeCompare(b.weapon) : b.kills - a.kills));
}

/**
 * Seleciona o MVP da partida: maior ACS, desempate por kills e, por fim, nome
 * ascendente (determinístico). Lista vazia → `null`.
 */
export function selectMatchMvp(
  rows: readonly MatchScoreboardRow[],
): MatchScoreboardRow | null {
  let best: MatchScoreboardRow | null = null;
  for (const row of rows) {
    if (best === null) {
      best = row;
      continue;
    }
    if (row.acs > best.acs) {
      best = row;
      continue;
    }
    if (row.acs < best.acs) {
      continue;
    }
    if (row.kills > best.kills) {
      best = row;
      continue;
    }
    if (row.kills === best.kills && row.name.localeCompare(best.name) < 0) {
      best = row;
    }
  }
  return best;
}

/** Soma dano/kills/deaths/assists de um time. Time ausente → zeros. */
export function computeTeamTotals(
  teamId: string,
  rows: readonly MatchScoreboardRow[],
): TeamTotals {
  let players = 0;
  let totalDamage = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  for (const row of rows) {
    if (row.teamId !== teamId) {
      continue;
    }
    players += 1;
    totalDamage += row.damageDealt;
    totalKills += row.kills;
    totalDeaths += row.deaths;
    totalAssists += row.assists;
  }
  return { teamId, players, totalDamage, totalKills, totalDeaths, totalAssists };
}
