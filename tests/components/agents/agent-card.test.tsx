import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentCard } from '@/components/agents';

const BASE = {
  name: 'Jett',
  role: 'Duelista',
  matches: 34,
  winRate: '61.8%',
  tierLabel: 'Tier S main',
  stats: [
    { label: 'ACS', value: '265', delta: 12 },
    { label: 'K/D', value: '1.28', delta: -0.1 },
  ],
  progresses: [{ label: 'Entry success', percent: 78.4, displayValue: '78.4%' }],
  tacticalNote: {
    tone: 'positive' as const,
    title: 'Status tático // recomendado:',
    description: 'Mantenha Jett como main em mapas com mid control.',
  },
};

describe('AgentCard', () => {
  it('tier main usa barra de acento e badge amarelo', () => {
    const html = renderToStaticMarkup(<AgentCard {...BASE} tier="main" />);
    expect(html).toContain('data-component="agent-card"');
    expect(html).toContain('data-tier="main"');
    expect(html).toContain('bg-accent');
    expect(html).toContain('Tier S main');
    expect(html).toContain('DUE');
    expect(html).toContain('34 partidas');
  });

  it('role ausente omite a tag de papel e o prefixo na linha de partidas', () => {
    const html = renderToStaticMarkup(
      <AgentCard {...BASE} tier="main" role={undefined} />,
    );
    expect(html).not.toContain('>DUE<');
    expect(html).not.toContain('Duelista •');
    expect(html).toContain('34 partidas');
  });

  it('tier bottleneck usa vermelho e nota de alerta', () => {
    const html = renderToStaticMarkup(
      <AgentCard
        {...BASE}
        tier="bottleneck"
        tierLabel="Bottleneck"
        winRate="42.1%"
        tacticalNote={{
          tone: 'warning',
          title: 'Alerta // gargalo crítico:',
          description: 'Win rate derruba o elo.',
        }}
      />,
    );
    expect(html).toContain('data-tier="bottleneck"');
    expect(html).toContain('text-loss');
    expect(html).toContain('bg-loss/5');
  });

  it('deltas positivos/negativos têm cores opostas', () => {
    const html = renderToStaticMarkup(<AgentCard {...BASE} tier="main" />);
    expect(html).toContain('data-stat-delta="up"');
    expect(html).toContain('data-stat-delta="down"');
  });

  it('barras de progresso recebem o percentual', () => {
    const html = renderToStaticMarkup(<AgentCard {...BASE} tier="main" />);
    expect(html).toContain('width:78.4%');
  });
});
