'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { formatRankChip } from '@/lib/format/rank';
import { cx } from '@/lib/cx';
import {
  applySortClick,
  sortScoreboardRows,
  type ScoreboardSortKey,
  type ScoreboardSortMode,
  type ScoreboardSortState,
} from '@/services/analytics/scoreboard-sort';

/**
 * ScoreboardTable — "tabela telemétrica da partida" (Stitch/match): cabeçalho
 * com badges e faixa de MMR, header por time (aliado/adversário, rounds e
 * resumo) e linhas de jogadores com ACS, K/D/A, +/-, ADR, HS%, KAST% e FK/FD
 * reais. As colunas têm largura FIXA (colgroup + table-fixed) para que os dois
 * times fiquem perfeitamente alinhados entre si. A linha do jogador buscado
 * ganha o badge "VOCÊ" e realce de fundo, como no design.
 *
 * As colunas de stats são ORDENÁVEIS (ilha client): 1º clique = melhores→piores,
 * 2º = piores→melhores, 3º = automático (ordem original). Linhas sem dado vão
 * sempre ao fim; a derivação mora em `services/analytics/scoreboard-sort`.
 */

export interface ScoreboardPlayer {
  readonly name: string;
  readonly tag?: string;
  /** Tier real (ex.: "Immortal 3") → ícone do elo ao lado do nickname + tier por extenso na 2ª linha. */
  readonly rank?: string;
  /** Ícone oficial do elo (asset local do tier); ausente → chip abreviado de texto. */
  readonly rankIconSrc?: string | null;
  readonly agent: string;
  /** Ícone do agente (asset local); ausente → só o nome. */
  readonly agentIconSrc?: string | null;
  readonly acs: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly kdDiff: number;
  /** ADR (dano por round); `null`/ausente → `—`. */
  readonly adr?: number | null;
  /** HS% computável; `null`/ausente → `—`. */
  readonly hsPercentage?: number | null;
  /** KAST% computado dos eventos; `null`/ausente → `—`. */
  readonly kastPercentage?: number | null;
  /** First bloods computados dos eventos de abate. */
  readonly firstBloods?: number;
  /** First deaths computados dos eventos de abate. */
  readonly firstDeaths?: number;
  /** ECON rating (HenrikDev v4 não fornece); `null`/ausente → `—`. */
  readonly econRating?: number | null;
  /** Linha do jogador buscado → badge "VOCÊ" e realce de fundo. */
  readonly isViewer?: boolean;
}

export interface ScoreboardTeam {
  readonly name: string;
  /** Rótulo contextual (ex.: "Time aliado"/"Time adversário"); default `name`. */
  readonly label?: string;
  readonly won?: boolean;
  readonly roundsWon?: number;
  readonly avgRating?: number;
  readonly econRating?: number;
  readonly totalDamage?: number;
  /** Time do jogador buscado → faixa de acento no header. */
  readonly isViewerTeam?: boolean;
  readonly players: readonly ScoreboardPlayer[];
}

export interface ScoreboardTableProps {
  readonly teams: readonly ScoreboardTeam[];
  /** Faixa de MMR da partida (ex.: "ASC 1 — IMM 2"); ausente → não exibe. */
  readonly rankRange?: string | null;
  readonly ariaLabel?: string;
  readonly className?: string;
}

/** Larguras fixas das 10 colunas (%), idênticas nos dois times. */
const COLUMNS = [
  { id: 'player', width: '24%' },
  { id: 'agent', width: '14%' },
  { id: 'acs', width: '7%' },
  { id: 'kda', width: '11%' },
  { id: 'diff', width: '7%' },
  { id: 'adr', width: '8%' },
  { id: 'hs', width: '7%' },
  { id: 'kast', width: '8%' },
  { id: 'fkfd', width: '8%' },
  { id: 'econ', width: '6%' },
] as const;

function playerKey(team: ScoreboardTeam, player: ScoreboardPlayer): string {
  return `${team.name}:${player.name}:${player.tag ?? ''}`;
}

/** Glifo do estado de ordenação (↓ melhores→piores, ↑ piores→melhores, ⇅ off). */
const SORT_GLYPH: Record<ScoreboardSortMode, string> = {
  best: '↓',
  worst: '↑',
  auto: '⇅',
};

/** Cabeçalho de coluna clicável: hover + indicador do ciclo de ordenação. */
function SortableHeader({
  label,
  sortKey,
  state,
  onSort,
  numeric = false,
  center = false,
}: {
  readonly label: string;
  readonly sortKey: ScoreboardSortKey;
  readonly state: ScoreboardSortState | null;
  readonly onSort: (key: ScoreboardSortKey) => void;
  readonly numeric?: boolean;
  readonly center?: boolean;
}) {
  const mode: ScoreboardSortMode =
    state !== null && state.key === sortKey ? state.mode : 'auto';
  const active = mode !== 'auto';

  return (
    <TableHeaderCell
      numeric={numeric}
      aria-sort={mode === 'best' ? 'descending' : mode === 'worst' ? 'ascending' : 'none'}
      className={cx(center && 'text-center')}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        data-sort-key={sortKey}
        data-sort-mode={mode}
        aria-label={`Ordenar por ${label}`}
        className={cx(
          'inline-flex w-full cursor-pointer items-center gap-1 uppercase transition-colors duration-[var(--duration-fast)]',
          numeric ? 'justify-end' : center ? 'justify-center' : 'justify-start',
          'text-inherit hover:text-text-primary',
          active && 'text-text-primary',
        )}
      >
        <span>{label}</span>
        <span
          aria-hidden="true"
          className={cx('font-hud', active ? 'text-accent-ink' : 'text-text-secondary')}
        >
          {SORT_GLYPH[mode]}
        </span>
      </button>
    </TableHeaderCell>
  );
}

export function ScoreboardTable({
  teams,
  rankRange,
  ariaLabel,
  className,
}: ScoreboardTableProps) {
  const [sort, setSort] = useState<ScoreboardSortState | null>(null);
  const handleSort = (key: ScoreboardSortKey): void => {
    setSort((current) => applySortClick(current, key));
  };

  return (
    <div
      data-component="scoreboard-table"
      className={cx('rounded-md border border-line bg-surface-raised p-3', className)}
      role={ariaLabel === undefined ? undefined : 'group'}
      aria-label={ariaLabel}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-hud text-label font-bold uppercase text-text-primary">
            <span aria-hidden="true">//&nbsp;</span>Tabela telemétrica da partida
          </span>
          <span className="bg-accent px-1 py-0.5 font-hud text-label-xs font-semibold uppercase text-text-primary">
            All roles computed
          </span>
          <span className="bg-surface-highest px-1 py-0.5 font-hud text-label-xs uppercase text-text-secondary">
            Fonte: API de partidas
          </span>
        </div>
        {rankRange == null ? null : (
          <span className="font-hud text-label-xs uppercase text-text-secondary">
            Ranked MMR range:{' '}
            <strong className="text-text-primary">{rankRange}</strong>
          </span>
        )}
      </header>

      {teams.map((team) => {
        const headerLabel = team.label ?? team.name;
        const outcome =
          team.roundsWon === undefined
            ? ''
            : team.won === undefined
              ? ` • ${team.roundsWon} ROUNDS`
              : ` • ${team.won ? 'VENCEDOR' : 'DERROTADO'}: ${team.roundsWon} ROUNDS`;
        const players =
          sort === null
            ? team.players
            : sortScoreboardRows(team.players, sort.key, sort.mode);

        return (
          <section key={team.name} className="mb-4 last:mb-0" data-scoreboard-team={team.name}>
            <header className="mb-1 flex flex-wrap items-center justify-between gap-2 border border-line bg-surface px-3 py-1.5 font-hud text-label uppercase text-text-primary">
              <span className="flex items-center gap-2 tracking-wide">
                <span
                  aria-hidden="true"
                  className={cx('size-2.5', team.isViewerTeam === true ? 'bg-accent' : 'bg-text-primary')}
                />
                <strong>
                  {headerLabel}
                  {outcome}
                </strong>
              </span>
              <span className="text-text-secondary">
                {team.avgRating !== undefined ? (
                  <>
                    Rating médio:{' '}
                    <strong className="text-text-primary">{team.avgRating.toFixed(2)}</strong>
                    {' • '}
                  </>
                ) : null}
                {team.econRating !== undefined ? (
                  <>
                    Econ:{' '}
                    <strong className="text-text-primary">{team.econRating.toFixed(1)}</strong>
                    {' • '}
                  </>
                ) : null}
                {team.totalDamage !== undefined ? (
                  <>
                    Dano total:{' '}
                    <strong className="text-text-primary">
                      {team.totalDamage.toLocaleString('pt-BR')}
                    </strong>
                  </>
                ) : null}
              </span>
            </header>

            <Table
              aria-label={`Placar do time ${team.name}`}
              className="min-w-[880px] table-fixed"
            >
              <colgroup>
                {COLUMNS.map((column) => (
                  <col key={column.id} style={{ width: column.width }} />
                ))}
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Jogador &amp; Ranque</TableHeaderCell>
                  <TableHeaderCell>Agente</TableHeaderCell>
                  <SortableHeader label="ACS" sortKey="acs" state={sort} onSort={handleSort} numeric />
                  <SortableHeader
                    label="K / D / A"
                    sortKey="kda"
                    state={sort}
                    onSort={handleSort}
                    center
                  />
                  <SortableHeader label="+/-" sortKey="diff" state={sort} onSort={handleSort} numeric />
                  <SortableHeader label="ADR" sortKey="adr" state={sort} onSort={handleSort} numeric />
                  <SortableHeader label="HS %" sortKey="hs" state={sort} onSort={handleSort} numeric />
                  <SortableHeader
                    label="KAST %"
                    sortKey="kast"
                    state={sort}
                    onSort={handleSort}
                    numeric
                  />
                  <SortableHeader
                    label="FK / FD"
                    sortKey="fkfd"
                    state={sort}
                    onSort={handleSort}
                    numeric
                  />
                  <SortableHeader
                    label="ECON"
                    sortKey="econ"
                    state={sort}
                    onSort={handleSort}
                    numeric
                  />
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((player) => (
                  <TableRow
                    key={playerKey(team, player)}
                    data-scoreboard-player={player.name}
                    data-viewer={player.isViewer === true ? 'true' : undefined}
                    className={cx(player.isViewer === true && 'bg-accent/20')}
                  >
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {player.isViewer === true ? (
                          <span className="shrink-0 bg-accent px-1 py-0.5 font-hud text-label-xs font-bold uppercase text-on-accent">
                            VOCÊ
                          </span>
                        ) : null}
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate font-semibold">{player.name}</span>
                            {player.tag !== undefined ? (
                              <span className="text-text-secondary">#{player.tag}</span>
                            ) : null}
                            {player.rank !== undefined ? (
                              player.rankIconSrc ? (
                                // Ícone SOZINHO ao lado do nickname — o tier por
                                // extenso já aparece na linha de baixo.
                                // eslint-disable-next-line @next/next/no-img-element -- ícone local do elo
                                <img
                                  src={player.rankIconSrc}
                                  alt=""
                                  title={player.rank}
                                  className="size-6 shrink-0 object-contain"
                                />
                              ) : (
                                // Sem asset local → fallback no chip de texto.
                                <span className="shrink-0 bg-surface-hover px-1 py-0.5 font-hud text-label-xs font-bold uppercase tracking-wider text-text-secondary">
                                  {formatRankChip(player.rank)}
                                </span>
                              )
                            ) : null}
                          </span>
                          {player.rank !== undefined ? (
                            <span className="block font-hud text-label-xs text-text-secondary">
                              {player.rank}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {player.agentIconSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element -- ícone local do agente
                          <img
                            src={player.agentIconSrc}
                            alt=""
                            className="size-6 shrink-0 border border-line object-cover"
                          />
                        ) : null}
                        <span className="truncate font-hud text-label uppercase">{player.agent}</span>
                      </span>
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      {player.acs}
                    </TableCell>
                    <TableCell className="text-center font-hud font-semibold">
                      {player.kills} / {player.deaths} / {player.assists}
                    </TableCell>
                    <TableCell
                      numeric
                      className={cx(
                        'font-semibold',
                        player.kdDiff >= 0 ? 'text-win' : 'text-loss',
                      )}
                    >
                      {player.kdDiff >= 0 ? `+${player.kdDiff}` : player.kdDiff}
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      {player.adr == null ? '—' : player.adr.toFixed(1)}
                    </TableCell>
                    <TableCell numeric>
                      {player.hsPercentage == null ? '—' : `${player.hsPercentage}%`}
                    </TableCell>
                    <TableCell numeric>
                      {player.kastPercentage == null ? '—' : `${player.kastPercentage}%`}
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      {player.firstBloods === undefined && player.firstDeaths === undefined
                        ? '—'
                        : `${player.firstBloods ?? 0} / ${player.firstDeaths ?? 0}`}
                    </TableCell>
                    <TableCell numeric>
                      {player.econRating == null ? '—' : player.econRating.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        );
      })}

      <footer className="mt-2 flex items-center gap-2 border-t border-line pt-2 font-hud text-label uppercase text-text-secondary">
        Scoreboard normalizado — KAST/Rating computados dos eventos; ECON indisponível na fonte
      </footer>
    </div>
  );
}
