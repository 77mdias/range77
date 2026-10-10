/**
 * Barrel dos charts visx (fase 4). Componentes apenas renderizam — todo
 * cálculo de escala/domínio/agregação vive em
 * `src/services/analytics/chart-transforms.ts` (100% coberto).
 */
export { AgentRadar, type AgentRadarProps } from './agent-radar';
export { MapWinrateBars, type MapWinrateBarsProps } from './map-winrate-bars';
export { RoundHeatmap, type RoundHeatmapProps } from './round-heatmap';
export { RrTrendChart, type RrTrendChartProps } from './rr-trend-chart';
export { TrendLine, type TrendLineProps } from './trend-line';
