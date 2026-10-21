import type { RiotRoundResultDto } from '@/contracts/riot';
import type { EconomySummary } from '@/contracts/tracker';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: agregados por jogador do payload Riot VAL-MATCH-V1
 * (analytics PURA, 100% coberta).
 * ======================================================================
 *
 * A Riot não entrega HS%, dano total nem economia agregada da partida: só os
 * registros por round (`roundResults[].playerStats[]`). Somamos aqui para que
 * o normalizador `riot → tracker` apenas mapeie campos. Mesmas convenções da
 * HenrikDev: HS% sobre tiros conectados (1 casa, `null` sem tiro) e ACS
 * inteiro.
 */

/** Totais de um jogador somados em todos os rounds. */
export interface RiotPlayerTotals {
  readonly headshots: number;
  readonly bodyshots: number;
  readonly legshots: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
  /** Soma de `spent`/`loadoutValue`; `null` se nenhum round trouxe economia. */
  readonly economy: EconomySummary | null;
}

interface MutableTotals {
  headshots: number;
  bodyshots: number;
  legshots: number;
  damageDealt: number;
  damageReceived: number;
  spent: number;
  loadoutValue: number;
  economyRounds: number;
}

/** HS% sobre tiros conectados (1 casa); nenhum tiro → `null`. */
export function computeHeadshotPercentage(
  headshots: number,
  bodyshots: number,
  legshots: number,
): number | null {
  const total = headshots + bodyshots + legshots;
  if (total === 0) {
    return null;
  }
  return roundTo((headshots / total) * 100, 1);
}

/** ACS = combat score / rounds (inteiro); sem rounds → 0. */
export function computeAcs(score: number, roundsPlayed: number): number {
  if (roundsPlayed <= 0) {
    return 0;
  }
  return Math.round(score / roundsPlayed);
}

/**
 * Soma tiros, dano causado/recebido e economia por PUUID numa passada sobre
 * os rounds. Quem só aparece como `receiver` entra com os demais totais zerados.
 */
export function aggregateRiotPlayerTotals(
  rounds: readonly RiotRoundResultDto[],
): ReadonlyMap<string, RiotPlayerTotals> {
  const acc = new Map<string, MutableTotals>();
  const get = (puuid: string): MutableTotals => {
    let entry = acc.get(puuid);
    if (entry === undefined) {
      entry = {
        headshots: 0,
        bodyshots: 0,
        legshots: 0,
        damageDealt: 0,
        damageReceived: 0,
        spent: 0,
        loadoutValue: 0,
        economyRounds: 0,
      };
      acc.set(puuid, entry);
    }
    return entry;
  };

  for (const round of rounds) {
    for (const stats of round.playerStats) {
      const own = get(stats.puuid);
      for (const hit of stats.damage) {
        own.headshots += hit.headshots;
        own.bodyshots += hit.bodyshots;
        own.legshots += hit.legshots;
        own.damageDealt += hit.damage;
        get(hit.receiver).damageReceived += hit.damage;
      }
      if (stats.economy !== null) {
        own.spent += stats.economy.spent;
        own.loadoutValue += stats.economy.loadoutValue;
        own.economyRounds += 1;
      }
    }
  }

  const totals = new Map<string, RiotPlayerTotals>();
  for (const [puuid, t] of acc) {
    totals.set(puuid, {
      headshots: t.headshots,
      bodyshots: t.bodyshots,
      legshots: t.legshots,
      damageDealt: t.damageDealt,
      damageReceived: t.damageReceived,
      economy:
        t.economyRounds === 0 ? null : { spent: t.spent, loadoutValue: t.loadoutValue },
    });
  }
  return totals;
}
