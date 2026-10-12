import type { MatchSummary } from '@/contracts/tracker';
import { agentRole } from '@/lib/agent-roles';
import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: assinatura tática por agente.
 * ======================================================================
 *
 * Cada papel tem UMA métrica-assinatura derivada de dados REAIS do tracker
 * (nunca inventada):
 *   - Duelista   → primeira sangue convertido (FB vencidos / duelos de
 *                  abertura disputados);
 *   - Iniciador
 *     /Controlador → fatia de assistências (assists / (kills + assists));
 *   - Sentinela  → taxa de sobrevivência por round.
 *
 * Regras de rigor: divisões por zero têm guarda (nunca Infinity/NaN) e
 * métricas não computáveis viram AUSÊNCIA (`null`) — o card omite a barra.
 */

/** Assinatura de exibição de um agente (espelha `AgentProgress`). */
export interface AgentSignature {
  readonly label: string;
  /** Percentual 0–100 (1 casa). */
  readonly percent: number;
  /** Ex.: `"78.4% (29/37)"`. */
  readonly displayValue: string;
}

function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

/** Duelista: FB vencidos sobre duelos de abertura; `null` sem timeline. */
function entrySignature(group: readonly MatchSummary[]): AgentSignature | null {
  const withEntry = group.filter(
    (match) => match.firstBloods !== undefined || match.firstDeaths !== undefined,
  );
  if (withEntry.length === 0) {
    return null;
  }
  const firstBloods = sumBy(withEntry, (match) => match.firstBloods ?? 0);
  const firstDeaths = sumBy(withEntry, (match) => match.firstDeaths ?? 0);
  const duels = firstBloods + firstDeaths;
  if (duels === 0) {
    return null;
  }
  const percent = roundTo((firstBloods / duels) * 100, 1);
  return {
    label: 'First blood conversion',
    percent,
    displayValue: `${percent}% (${firstBloods}/${duels})`,
  };
}

/** Iniciador/Controlador: fatia de assistências no kill participation. */
function assistSignature(group: readonly MatchSummary[]): AgentSignature | null {
  const kills = sumBy(group, (match) => match.kills);
  const assists = sumBy(group, (match) => match.assists);
  const involvement = kills + assists;
  if (involvement === 0) {
    return null;
  }
  const percent = roundTo((assists / involvement) * 100, 1);
  return {
    label: 'Assist share',
    percent,
    displayValue: `${percent}% (${assists}/${involvement})`,
  };
}

/** Sentinela: rounds em que sobreviveu (rounds − deaths) / rounds. */
function survivalSignature(group: readonly MatchSummary[]): AgentSignature | null {
  const rounds = sumBy(group, (match) => match.roundsPlayed);
  if (rounds === 0) {
    return null;
  }
  const deaths = sumBy(group, (match) => match.deaths);
  const survived = Math.max(0, rounds - deaths);
  const percent = roundTo((survived / rounds) * 100, 1);
  return {
    label: 'Survival rate',
    percent,
    displayValue: `${percent}% (${survived}/${rounds})`,
  };
}

function signatureFor(agent: string, group: readonly MatchSummary[]): AgentSignature | null {
  const role = agentRole(agent);
  switch (role) {
    case 'Duelista':
      return entrySignature(group);
    case 'Iniciador':
    case 'Controlador':
      return assistSignature(group);
    case 'Sentinela':
      return survivalSignature(group);
    default:
      // Papel desconhecido: sem assinatura (nunca fabricada).
      return null;
  }
}

/**
 * Assinatura por agente (chave = nome do agente, o mesmo das agregações).
 * Agentes com papel desconhecido ou métrica não computável ficam de fora.
 */
export function buildAgentSignatures(
  matches: readonly MatchSummary[],
): ReadonlyMap<string, AgentSignature> {
  const groups = new Map<string, MatchSummary[]>();
  for (const match of matches) {
    const key = match.agent ?? 'Desconhecido';
    const bucket = groups.get(key);
    if (bucket === undefined) {
      groups.set(key, [match]);
    } else {
      bucket.push(match);
    }
  }

  const signatures = new Map<string, AgentSignature>();
  for (const [agent, group] of groups) {
    const signature = signatureFor(agent, group);
    if (signature !== null) {
      signatures.set(agent, signature);
    }
  }
  return signatures;
}
