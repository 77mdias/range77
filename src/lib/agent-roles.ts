/**
 * Papéis (roles) dos agentes do Valorant — dado OFICIAL e estático do jogo.
 *
 * Tabela explícita (mesma convenção de `valorant-assets`): o nome chega da
 * HenrikDev em inglês ("KAY/O", "Waylay") e é normalizado para a chave. Nome
 * fora da tabela → `null` (a view omite o papel, nunca chuta um valor).
 *
 * Usado para derivar a assinatura tática por agente
 * (`services/analytics/agent-signatures`) e a tag de papel do card.
 */

import { normalizeValorantName } from './valorant-assets';

export type AgentRole = 'Duelista' | 'Controlador' | 'Iniciador' | 'Sentinela';

const AGENT_ROLES: Readonly<Record<string, AgentRole>> = {
  // Duelistas
  jett: 'Duelista',
  phoenix: 'Duelista',
  raze: 'Duelista',
  reyna: 'Duelista',
  yoru: 'Duelista',
  neon: 'Duelista',
  iso: 'Duelista',
  waylay: 'Duelista',
  // Controladores
  brimstone: 'Controlador',
  viper: 'Controlador',
  omen: 'Controlador',
  astra: 'Controlador',
  harbor: 'Controlador',
  clove: 'Controlador',
  miks: 'Controlador',
  // Iniciadores
  sova: 'Iniciador',
  breach: 'Iniciador',
  skye: 'Iniciador',
  'kay-o': 'Iniciador',
  fade: 'Iniciador',
  gekko: 'Iniciador',
  tejo: 'Iniciador',
  // Sentinelas
  sage: 'Sentinela',
  cypher: 'Sentinela',
  killjoy: 'Sentinela',
  chamber: 'Sentinela',
  deadlock: 'Sentinela',
  vyse: 'Sentinela',
  veto: 'Sentinela',
};

/** Papel do agente; `null` quando o nome não está na tabela oficial. */
export function agentRole(agent: string): AgentRole | null {
  return AGENT_ROLES[normalizeValorantName(agent)] ?? null;
}
