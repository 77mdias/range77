import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ConsolePage from '@/app/(app)/console/page';
import { ConsoleView } from '@/app/(app)/console/console-view';
import {
  COACH_PROMPTS,
  CONSOLE_LAYERS,
  SEED_EXCHANGE,
  coachReply,
} from '@/app/(app)/console/console-data';

/**
 * SUITE TDD — Console (tela Stitch "Console API & IA Coaching Assistant"):
 * header SYS.CONSOLE, strip de KPIs, pipeline 3-layer, inspetor de payload
 * (layer tabs + code viewer + nota arquitetural) e o chat sandbox do coach.
 */

const html = () => renderToStaticMarkup(<ConsoleView />);

describe('ConsoleView', () => {
  it('renderiza o header SYS.CONSOLE e o título da tela', () => {
    const output = html();
    expect(output).toContain('data-component="console-view"');
    expect(output).toContain('SYS.CONSOLE // ARCHITECTURE_V4');
    expect(output).toContain('Console da pipeline de dados');
    expect(output).toContain('coaching assistant');
  });

  it('renderiza o strip de KPIs (token ratio + latência)', () => {
    const output = html();
    expect(output).toContain('data-component="kpi-tile"');
    expect(output).toContain('Token Optimization Ratio');
    expect(output).toContain('98.5%');
    expect(output).toContain('Latency / Roundtrip');
    expect(output).toContain('142ms');
  });

  it('renderiza os três estágios da pipeline', () => {
    const output = html();
    expect(output).toContain('data-component="pipeline-flow"');
    expect(output).toContain('Camada 01: Raw Riot API (simulada)');
    expect(output).toContain('Camada 02: Motor de KPIs');
    expect(output).toContain('Camada 03: Contexto MiniMax');
    expect(output).toContain('1.8 KB / 420 TOKENS');
  });

  it('abre o inspetor na camada 1 e lista as três abas', () => {
    const output = html();
    expect(output).toContain('data-console-inspector');
    expect(output).toContain('SCHEMA: PROTOCOL_V4.JSON');
    expect(output).toContain('raw_riot_match.payload.json');
    expect(output).toContain('raw_kill_events');
    // Payload ilustrativo é rotulado como simulado (regra: nada passa por real)
    expect(output).toContain('data-payload-simulated');
    expect(output).toContain('exemplo ilustrativo');
    for (const layer of CONSOLE_LAYERS) {
      expect(output).toContain(layer.label);
    }
  });

  it('oferece as ações do code viewer e a nota arquitetural', () => {
    const output = html();
    expect(output).toContain('Copiar Payload');
    expect(output).toContain('Exportar Schemas');
    expect(output).toContain('Simular Nova Partida');
    expect(output).toContain('Propriedade arquitetural');
    expect(output).toContain('420 tokens');
  });

  it('renderiza o chat sandbox com saudação, exemplo e aviso de simulação', () => {
    const output = html();
    expect(output).toContain('AI Coach Chat Sandbox');
    expect(output).toContain('data-console-chat');
    expect(output).toContain('Sessão sandbox iniciada');
    expect(output).toContain('coach simulado deste sandbox');
    expect(output).toContain(SEED_EXCHANGE.prompt);
    expect(output).toContain('Biela');
    expect(output).toContain('Drill recomendado');
    expect(output).toContain('Respostas simuladas (demo)');
  });

  it('renderiza a barra de envio e as sugestões de prompt', () => {
    const output = html();
    expect(output).toContain('data-console-prompts');
    expect(output).toContain('placeholder="Pergunte ao coach sobre a sua partida..."');
    for (const prompt of COACH_PROMPTS) {
      expect(output).toContain(prompt);
    }
  });
});

describe('ConsolePage', () => {
  it('monta a ilha do console', () => {
    const output = renderToStaticMarkup(<ConsolePage />);
    expect(output).toContain('data-component="console-view"');
  });
});

describe('console-data', () => {
  it('define exatamente três camadas (l1/l2/l3)', () => {
    expect(CONSOLE_LAYERS.map((layer) => layer.id)).toEqual(['l1', 'l2', 'l3']);
  });

  it('a troca de exemplo traz drill embutido', () => {
    expect(SEED_EXCHANGE.replyEmbedded).toBeDefined();
  });

  it('coachReply é determinístico e ecoa o prompt', () => {
    const reply = coachReply('  O que é retake?  ');
    expect(reply).toContain('"O que é retake?"');
    expect(reply).toContain('simulada');
    expect(coachReply('O que é retake?')).toBe(reply);
  });
});
