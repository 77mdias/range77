import { roundTo } from './combat';

/**
 * PASSO 3 — IMPLEMENTAÇÃO: ordenação da tabela telemétrica da partida.
 * ===================================================================
 *
 * Lógica PURA do clique nas colunas de stats: 1º clique ordena do MELHOR para
 * o PIOR, 2º do PIOR para o MELHOR e 3º volta ao AUTOMÁTICO (ordem original do
 * scoreboard). Métricas que dependem de dado ausente nunca são inventadas:
 * linhas sem valor ficam SEMPRE no fim, independente da direção. Empates
 * desempatam pelo nome (determinístico). 100% coberto.
 */

/** Colunas de stats ordenáveis (dado real do scoreboard). */
export type ScoreboardSortKey =
  | 'acs'
  | 'kda'
  | 'diff'
  | 'adr'
  | 'hs'
  | 'kast'
  | 'fkfd'
  | 'econ';

/** Modo da ordenação: `auto` = ordem original; `best`/`worst` = por métrica. */
export type ScoreboardSortMode = 'auto' | 'best' | 'worst';

/** Estado ativo de ordenação (coluna + modo). */
export interface ScoreboardSortState {
  readonly key: ScoreboardSortKey;
  readonly mode: ScoreboardSortMode;
}

/** Forma mínima de uma linha para ordenar (compatível com `ScoreboardPlayer`). */
export interface ScoreboardSortRow {
  readonly name: string;
  readonly acs: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly kdDiff: number;
  readonly adr?: number | null;
  readonly hsPercentage?: number | null;
  readonly kastPercentage?: number | null;
  readonly firstBloods?: number;
  readonly firstDeaths?: number;
  readonly econRating?: number | null;
}

/** KDA = (K + A) / D; deaths=0 → K + A (nunca Infinity). */
export function displayKda(kills: number, deaths: number, assists: number): number {
  return deaths === 0 ? kills + assists : (kills + assists) / deaths;
}

/** Ciclo do clique: melhores→piores → piores→melhores → automático → … */
export function nextSortMode(mode: ScoreboardSortMode): ScoreboardSortMode {
  switch (mode) {
    case 'best':
      return 'worst';
    case 'worst':
      return 'auto';
    case 'auto':
      return 'best';
  }
}

/**
 * Próximo estado ao clicar numa coluna: outra coluna reinicia em "melhores";
 * a mesma coluna avança no ciclo (`nextSortMode`).
 */
export function applySortClick(
  current: ScoreboardSortState | null,
  key: ScoreboardSortKey,
): ScoreboardSortState {
  if (current === null || current.key !== key) {
    return { key, mode: 'best' };
  }
  return { key, mode: nextSortMode(current.mode) };
}

/** Valor comparável de uma linha por coluna; `null` = sem dado → vai ao fim. */
function sortValue(row: ScoreboardSortRow, key: ScoreboardSortKey): number | null {
  switch (key) {
    case 'acs':
      return row.acs;
    case 'kda':
      return roundTo(displayKda(row.kills, row.deaths, row.assists), 4);
    case 'diff':
      return row.kdDiff;
    case 'adr':
      return row.adr ?? null;
    case 'hs':
      return row.hsPercentage ?? null;
    case 'kast':
      return row.kastPercentage ?? null;
    case 'fkfd':
      return row.firstBloods ?? null;
    case 'econ':
      return row.econRating ?? null;
  }
}

/**
 * Ordena as linhas pela coluna/modo pedidos. `auto` devolve a ordem de entrada
 * intacta. Linhas sem dado ficam sempre no fim; empates pelo nome. Não muta a
 * entrada.
 */
export function sortScoreboardRows<T extends ScoreboardSortRow>(
  rows: readonly T[],
  key: ScoreboardSortKey,
  mode: ScoreboardSortMode,
): readonly T[] {
  if (mode === 'auto') {
    return rows;
  }

  // Comparador: negativo = `a` antes de `b`. `best` → maior primeiro.
  const sign = mode === 'best' ? 1 : -1;

  const measured = rows
    .map((row) => ({ row, value: sortValue(row, key) }))
    .filter((entry): entry is { row: T; value: number } => entry.value !== null);

  measured.sort((a, b) => {
    if (a.value === b.value) {
      return a.row.name.localeCompare(b.row.name);
    }
    return a.value < b.value ? sign : -sign;
  });

  const missing = rows.filter((row) => sortValue(row, key) === null);

  return [...measured.map((entry) => entry.row), ...missing];
}
