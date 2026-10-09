import type { AgentStat, GroupedStat, KillEvent, MatchRound } from '@/contracts/tracker';
import { roundTo } from './combat';

/**
 * PASSO 4 — TRANSFORMAÇÕES DE DADOS para os charts visx.
 * ======================================================================
 *
 * Funções PURAS e determinísticas: recebem os contratos normalizados do
 * tracker e produzem EXATAMENTE o que os componentes visuais plotam
 * (domínios, pontos, células, eixos normalizados 0–1). Nenhum cálculo nos
 * componentes — eles só renderizam SVG.
 *
 * Convenções de rigor: divisões por zero com guarda; domínio de linha
 * plana é expandido (±1) para nunca gerar escala degenerada; métricas
 * normalizadas são clampeadas em [0, 1].
 */

// ----------------------------------------------------------------------
// TrendLine — série temporal de uma métrica por partida
// ----------------------------------------------------------------------

export interface TrendPoint {
  /** Índice cronológico (0 = mais antiga). */
  readonly index: number;
  readonly value: number;
}

/** Pontos (index, value) na ordem cronológica de entrada. */
export function buildTrendPoints(values: readonly number[]): TrendPoint[] {
  return values.map((value, index) => ({ index, value }));
}

/**
 * Domínio do eixo Y: [mín, máx] com folga de 5% (mín. 1 unidade) para a
 * linha não colar nas bordas. Lista vazia → [0, 1]; linha plana → ±1.
 */
export function valueDomain(values: readonly number[]): readonly [number, number] {
  if (values.length === 0) {
    return [0, 1];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) {
    return [min - 1, max + 1];
  }
  const padding = Math.max(span * 0.05, 0.5);
  return [roundTo(min - padding, 2), roundTo(max + padding, 2)];
}

// ----------------------------------------------------------------------
// MapWinrateBars — barras de winrate por mapa
// ----------------------------------------------------------------------

export interface WinrateBar {
  readonly key: string;
  readonly matches: number;
  readonly wins: number;
  /** 0–100 (1 casa). */
  readonly winrate: number;
}

/** Barras ordenadas por winrate desc → partidas desc → chave asc. */
export function buildWinrateBars(stats: readonly GroupedStat[]): WinrateBar[] {
  const bars: WinrateBar[] = stats.map((stat) => ({
    key: stat.key,
    matches: stat.matches,
    wins: stat.wins,
    winrate: stat.winrate,
  }));

  bars.sort((a, b) => {
    if (a.winrate !== b.winrate) {
      return b.winrate - a.winrate;
    }
    if (a.matches !== b.matches) {
      return b.matches - a.matches;
    }
    return a.key.localeCompare(b.key);
  });

  return bars;
}

// ----------------------------------------------------------------------
// RoundHeatmap — células round-a-round do detalhe da partida
// ----------------------------------------------------------------------

export type RoundCellResult = 'win' | 'loss';

export interface RoundCell {
  readonly roundNumber: number;
  readonly result: RoundCellResult;
  readonly kills: number;
  readonly plantSite: string | null;
  readonly defused: boolean;
}

/**
 * Uma célula por round, do ponto de vista do time `teamId`: cor = resultado,
 * intensidade = abates no round (contados da timeline `kills`).
 */
export function buildRoundHeatmapCells(
  rounds: readonly MatchRound[],
  kills: readonly KillEvent[],
  teamId: string,
): RoundCell[] {
  return rounds.map((round) => ({
    roundNumber: round.roundNumber,
    result: round.winningTeamId === teamId ? 'win' : 'loss',
    kills: kills.filter((kill) => kill.roundNumber === round.roundNumber).length,
    plantSite: round.plantSite,
    defused: round.defused,
  }));
}

// ----------------------------------------------------------------------
// AgentRadar — perfil do agente vs. média do jogador (normalizado 0–1)
// ----------------------------------------------------------------------

/** Teto por eixo: valores acima do cap saturam em 1 (documentado no chart). */
const RADAR_AXIS_DEFS = [
  { axis: 'Winrate', cap: 100, pick: (stat: AgentStat): number => stat.winrate },
  { axis: 'KDA', cap: 5, pick: (stat: AgentStat): number => stat.kda },
  { axis: 'ACS', cap: 350, pick: (stat: AgentStat): number => stat.avgAcs },
  { axis: 'HS%', cap: 50, pick: (stat: AgentStat): number => stat.avgHsPercentage ?? 0 },
] as const;

function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export interface RadarAxis {
  readonly axis: string;
  /** Agente normalizado 0–1. */
  readonly value: number;
  /** Média do jogador (todos os agentes) normalizada 0–1. */
  readonly baseline: number;
}

/**
 * Radar do agente `agentKey` vs. a média do jogador. Retorna `null` se o
 * agente não estiver nas agregações (componente nem renderiza).
 */
export function buildAgentRadar(
  agents: readonly AgentStat[],
  agentKey: string,
): readonly RadarAxis[] | null {
  const agent = agents.find((candidate) => candidate.key === agentKey);
  if (agent === undefined) {
    return null;
  }

  return RADAR_AXIS_DEFS.map((definition) => {
    const value = clamp01(Math.min(definition.pick(agent), definition.cap) / definition.cap);
    // `agent` existe ⇒ agents.length ≥ 1 (média sobre todos os agentes).
    const baseline =
      agents.reduce((sum, candidate) => sum + definition.pick(candidate), 0) /
      (definition.cap * agents.length);
    return {
      axis: definition.axis,
      value: roundTo(clamp01(value), 3),
      baseline: roundTo(clamp01(baseline), 3),
    };
  });
}

/**
 * Pontos do polígono radial (0–1 → pixels): primeiro eixo no topo (-90°),
 * seguindo em sentido horário. `values[i]` corresponde a `axes[i]`.
 */
export interface PolarPoint {
  readonly x: number;
  readonly y: number;
}

export function radarPolygonPoints(
  values: readonly number[],
  centerX: number,
  centerY: number,
  radius: number,
): PolarPoint[] {
  return values.map((value, index) => {
    const clamped = clamp01(value);
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / values.length;
    return {
      x: roundTo(centerX + Math.cos(angle) * radius * clamped, 2),
      y: roundTo(centerY + Math.sin(angle) * radius * clamped, 2),
    };
  });
}

/** Raios (0.25/0.5/0.75/1) dos anéis-guia do radar. */
export const RADAR_GUIDE_RATIOS = [0.25, 0.5, 0.75, 1] as const;
