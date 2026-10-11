/**
 * Conteúdo estático do Console (tela Stitch #4 "Console API & IA Coaching
 * Assistant"): estágios da pipeline 3-layer, payloads-ilustrativos das três
 * camadas e o roteiro do chat sandbox do coach.
 *
 * Nada aqui é cálculo nem telemetria real: são EXEMPLOS de forma (demo
 * rotulada) usados para montar a tela de inspeção da pipeline.
 */

import type { PipelineStage } from '@/components/ai';

export interface ConsoleLayer {
  readonly id: string;
  readonly label: string;
  readonly filename: string;
  readonly badge: string;
  /** Exemplo de forma do payload da camada (demo — não é telemetria real). */
  readonly payload: string;
}

export const CONSOLE_LAYERS: readonly ConsoleLayer[] = [
  {
    id: 'l1',
    label: '1: Raw HenrikDev',
    filename: 'raw_henrikdev.payload.json',
    badge: '420 KB • sem compressão',
    payload: `{
  "status": 200,
  "source": "api.henrikdev.xyz/valorant/v3/matches/br/NEXUS/BR1",
  "matches": [
    {
      "metadata": { "map": "Ascent", "game_length": 2410 },
      "raw_kill_events": ["/* 14.200 linhas omitidas */"]
    }
  ]
}`,
  },
  {
    id: 'l2',
    label: '2: KPIs normalizados',
    filename: 'kpi_matrix.payload.json',
    badge: '48 KB • validado por Zod',
    payload: `{
  "engine": "telemetry-kpi-engine",
  "aggregated_metrics": {
    "adr_weighted": 164.2,
    "hs_pct_normalized": 28.4,
    "kast_trend": 73.8,
    "econ_rating": 62.1
  },
  "map_breakdowns": {
    "ascent": { "win_rate": 0.44, "first_death_rate": 0.24 },
    "bind": { "win_rate": 0.68, "first_death_rate": 0.09 }
  },
  "pruned_event_nodes": 4112
}`,
  },
  {
    id: 'l3',
    label: '3: Prompt MiniMax',
    filename: 'minimax_coach_v4.payload.json',
    badge: '1.8 KB • 420 tokens',
    payload: `{
  "player_meta": { "tag": "NEXUS#BR1", "current_tier": "Ascendant 3", "rr": 78 },
  "critical_weaknesses": [
    { "scenario": "bonus_round_discipline", "severity": "HIGH", "waste_rate_creds": 3400 },
    { "scenario": "ascent_b_postplant_overpeek", "death_freq_pct": 71 }
  ],
  "tactical_archetype": "aggressive_entry",
  "focus_drills": ["crosshair_height_isolation", "range_hard_bots_sheriff"]
}`,
  },
];

export const PIPELINE_STAGES: readonly PipelineStage[] = [
  {
    label: 'Camada 01: Raw HenrikDev',
    sizeChip: '420 KB',
    title: 'Raw Match JSON • eventos não comprimidos',
    meta: '18.420 linhas • round_events, kills, ticks',
  },
  {
    label: 'Camada 02: Motor de KPIs',
    sizeChip: '48 KB',
    title: 'Métricas calculadas e agregações de econ',
    meta: 'Drift check: ok • econ_variance, peeks',
  },
  {
    label: 'Camada 03: Contexto MiniMax',
    sizeChip: '1.8 KB / 420 TOKENS',
    title: 'Prompt cognitivo condensado',
    meta: 'Pronto para inferência • context injection',
    highlighted: true,
  },
];

export interface PayloadPropertyNote {
  readonly label: string;
  readonly body: string;
}

/** Nota arquitetural exibida abaixo do inspetor (fiel à tela Stitch). */
export const PAYLOAD_PROPERTY_NOTE: PayloadPropertyNote = {
  label: 'Propriedade arquitetural',
  body:
    'Ao condensar eventos granulares em uma matriz estrita de arquétipos táticos e fraquezas ' +
    'de cenário, reduzimos o contexto de ~80k tokens para apenas 420 tokens — o LLM responde ' +
    'abaixo de 200ms com zero alucinação sobre a economia do jogo.',
};

export interface CoachExchange {
  readonly prompt: string;
  readonly reply: string;
  /** Bloco embutido na resposta (ex.: drill recomendado). */
  readonly replyEmbedded?: string;
}

/** Saudação inicial do coach no sandbox (demo rotulada). */
export const COACH_GREETING =
  'Olá! Sou o coach simulado deste sandbox. Em produção recebo apenas o payload da camada 3 ' +
  '(arquétipos táticos + fraquezas) e devolvo o plano de jogo — sem alucinar sobre a economia.';

/** Pergunta/resposta de exemplo exibidas já no primeiro paint. */
export const SEED_EXCHANGE: CoachExchange = {
  prompt: 'Qual o melhor setup de mira para parar de overpeekar na B da Ascent?',
  reply:
    'Na B da Ascent, com a Spike cravada no Default, recue para a Biela (Lane) ou feche o ' +
    'Mercado. O erro é peitar o CT aberto na mira de quem sai de lá.',
  replyEmbedded:
    'Aguarde o som de defuse (~1,5s) e jogue no contra-tempo do utilitário com flash ' +
    'invertida, em vez de segurar o ângulo passivo no aberto.',
};

/** Prompts prontos do sandbox do coach. */
export const COACH_PROMPTS: readonly string[] = [
  'Como a camada 2 detecta overpeek?',
  'O que é disciplina de round bônus?',
  'Por que o prompt tem só 420 tokens?',
];

/**
 * Resposta SIMULADA do sandbox (demo). Não consulta conta nem backend —
 * monta um texto explicativo determinístico a partir do prompt.
 */
export function coachReply(prompt: string): string {
  const normalized = prompt.trim();
  return (
    `Resposta simulada do sandbox para "${normalized}". ` +
    'No produto real esta mensagem viria da camada 3 (MiniMax-Val-03) com o ' +
    'contexto tático do jogador; aqui a sessão é apenas demonstrativa.'
  );
}
