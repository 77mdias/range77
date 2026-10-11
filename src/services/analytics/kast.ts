/**
 * PASSO 3 — IMPLEMENTAÇÃO: cálculo de KAST por jogador (por round).
 * ======================================================================
 *
 * KAST mede a fração de rounds em que o jogador foi útil: teve um **K**ill,
 * uma **A**ssist, **S**urviveu ou foi abatido e **T**rocado (vingado por um
 * companheiro no MESMO round). A fonte oficial (HenrikDev/Riot) não fornece
 * o número — derivamos dos eventos de abate + lista de rounds.
 *
 * Definição adotada (documentada em DESIGN.md):
 *   contribuição do round = K ∨ A ∨ S ∨ T, com T = o jogador morreu e um
 *   companheiro de time matou o assassino ainda no mesmo round.
 *
 * Funções PURAS: entrada neutra (adapta-se tanto ao payload v4 bruto quanto
 * ao detalhe normalizado). Sem timestamps: o trade é resolvido dentro do
 * round, como na definição do produto.
 */

/** Abate na forma neutra exigida pelo cálculo. */
export interface KastKill {
  /** Round 1-based. */
  readonly roundNumber: number;
  readonly killerPuuid: string;
  readonly victimPuuid: string;
  readonly assistantPuuids: readonly string[];
}

export interface KastInput {
  /** Números de round (1-based) que compõem a partida. */
  readonly roundNumbers: readonly number[];
  readonly kills: readonly KastKill[];
  /** PUUID → time ("Red"/"Blue"), para resolver o trade entre companheiros. */
  readonly teamByPuuid: ReadonlyMap<string, string>;
}

/** Abates agrupados por round (uma passada). */
function groupKillsByRound(kills: readonly KastKill[]): Map<number, KastKill[]> {
  const byRound = new Map<number, KastKill[]>();
  for (const kill of kills) {
    const bucket = byRound.get(kill.roundNumber);
    if (bucket === undefined) {
      byRound.set(kill.roundNumber, [kill]);
    } else {
      bucket.push(kill);
    }
  }
  return byRound;
}

/**
 * KAST% (0–100, 1 casa) de CADA jogador presente em `teamByPuuid`.
 *
 * Sem rounds, sem jogadores ou sem eventos de abate NÃO há base de K/A/T —
 * um mapa "só sobrevivência" daria 100% falso; preferimos mapa vazio (a view
 * mostra `—`). PUUIDs vazios nunca aparecem no resultado.
 */
export function computeKastByPlayer(input: KastInput): ReadonlyMap<string, number> {
  const { roundNumbers, kills, teamByPuuid } = input;
  const result = new Map<string, number>();
  if (roundNumbers.length === 0 || teamByPuuid.size === 0 || kills.length === 0) {
    return result;
  }

  const killsByRound = groupKillsByRound(kills);
  const credited = new Map<string, number>();
  for (const puuid of teamByPuuid.keys()) {
    credited.set(puuid, 0);
  }
  const bump = (puuid: string): void => {
    credited.set(puuid, (credited.get(puuid) as number) + 1);
  };

  for (const roundNumber of roundNumbers) {
    const roundKills = killsByRound.get(roundNumber) as KastKill[] | undefined;
    if (roundKills === undefined) {
      // Round sem abates registrados: todos sobreviveram — S para todos.
      for (const puuid of teamByPuuid.keys()) {
        bump(puuid);
      }
      continue;
    }

    // PUUIDs que cada time matou neste round: base do "T" (trade).
    const killedByTeam = new Map<string, Set<string>>();
    for (const kill of roundKills) {
      const killerTeam = teamByPuuid.get(kill.killerPuuid);
      if (killerTeam === undefined || kill.victimPuuid === '') {
        continue;
      }
      const victims = killedByTeam.get(killerTeam);
      if (victims === undefined) {
        killedByTeam.set(killerTeam, new Set([kill.victimPuuid]));
      } else {
        victims.add(kill.victimPuuid);
      }
    }

    for (const [puuid, ownTeam] of teamByPuuid) {
      // K ou A: participou de qualquer abate do round.
      const scored = roundKills.some(
        (kill) => kill.killerPuuid === puuid || kill.assistantPuuids.includes(puuid),
      );
      if (scored) {
        bump(puuid);
        continue;
      }

      const death = roundKills.find((kill) => kill.victimPuuid === puuid);
      if (death === undefined) {
        // S: não morreu no round.
        bump(puuid);
        continue;
      }

      // T: morreu, mas o próprio time matou o assassino no mesmo round.
      if (killedByTeam.get(ownTeam)?.has(death.killerPuuid) === true) {
        bump(puuid);
      }
    }
  }

  for (const [puuid, count] of credited) {
    if (puuid === '') {
      continue;
    }
    result.set(puuid, Math.round((count / roundNumbers.length) * 1000) / 10);
  }

  return result;
}

/** KAST% de UM jogador; `null` quando não computável (sem base). */
export function computePlayerKast(input: KastInput, puuid: string): number | null {
  const value = computeKastByPlayer(input).get(puuid);
  return value === undefined ? null : value;
}
