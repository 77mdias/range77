import { describe, expect, it } from 'vitest';
import { agentRole } from '@/lib/agent-roles';

/**
 * SUITE — papéis oficiais dos agentes: tabela estática normalizada por nome
 * (variações da HenrikDev) com `null` fora da tabela.
 */

describe('agentRole', () => {
  it('resolve um agente por papel', () => {
    expect(agentRole('Jett')).toBe('Duelista');
    expect(agentRole('Omen')).toBe('Controlador');
    expect(agentRole('Sova')).toBe('Iniciador');
    expect(agentRole('Chamber')).toBe('Sentinela');
  });

  it('normaliza variações de nome (KAY/O)', () => {
    expect(agentRole('KAY/O')).toBe('Iniciador');
    expect(agentRole('  fade ')).toBe('Iniciador');
  });

  it('agente desconhecido devolve null', () => {
    expect(agentRole('Ultra')).toBeNull();
    expect(agentRole('')).toBeNull();
  });
});
