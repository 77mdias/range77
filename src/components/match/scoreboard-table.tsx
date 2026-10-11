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

/**
 * ScoreboardTable — "tabela telemétrica da partida" (Stitch/match): header por
 * time (aliado/adversário, rounds e resumo) e linhas de jogadores com ACS,
 * K/D/A, +/-, ADR, HS%, KAST% e FK/FD reais. A linha do jogador buscado ganha
 * o badge "VOCÊ" e realce de fundo, como no design.
 */

export interface ScoreboardPlayer {
  readonly name: string;
  readonly tag?: string;
  /** Tier real (ex.: "Immortal 3") → chip abreviado + segunda linha. */
  readonly rank?: string;
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
  readonly ariaLabel?: string;
  readonly className?: string;
}

function playerKey(team: ScoreboardTeam, player: ScoreboardPlayer): string {
  return `${team.name}:${player.name}:${player.tag ?? ''}`;
}

export function ScoreboardTable({ teams, ariaLabel, className }: ScoreboardTableProps) {
  return (
    <div
      data-component="scoreboard-table"
      className={cx('rounded-md border border-line bg-surface-raised p-3', className)}
      role={ariaLabel === undefined ? undefined : 'group'}
      aria-label={ariaLabel}
    >
      {teams.map((team) => {
        const headerLabel = team.label ?? team.name;
        const outcome =
          team.roundsWon === undefined
            ? ''
            : team.won === undefined
              ? ` • ${team.roundsWon} ROUNDS`
              : ` • ${team.won ? 'VENCEDOR' : 'DERROTADO'}: ${team.roundsWon} ROUNDS`;

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

            <Table aria-label={`Placar do time ${team.name}`}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Jogador &amp; Ranque</TableHeaderCell>
                  <TableHeaderCell>Agente</TableHeaderCell>
                  <TableHeaderCell numeric>ACS</TableHeaderCell>
                  <TableHeaderCell numeric className="text-center">
                    K / D / A
                  </TableHeaderCell>
                  <TableHeaderCell numeric>+/-</TableHeaderCell>
                  <TableHeaderCell numeric>ADR</TableHeaderCell>
                  <TableHeaderCell numeric>HS %</TableHeaderCell>
                  <TableHeaderCell numeric>KAST %</TableHeaderCell>
                  <TableHeaderCell numeric>FK / FD</TableHeaderCell>
                  <TableHeaderCell numeric>ECON</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {team.players.map((player) => (
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
                              <span
                                className={cx(
                                  'shrink-0 px-1 py-0.5 font-hud text-label-xs font-bold uppercase tracking-wider',
                                  player.isViewer === true
                                    ? 'bg-text-primary text-accent'
                                    : 'bg-surface-hover text-text-secondary',
                                )}
                              >
                                {formatRankChip(player.rank)}
                              </span>
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
                        <span className="font-hud text-label uppercase">{player.agent}</span>
                      </span>
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      {player.acs}
                    </TableCell>
                    <TableCell numeric className="text-center font-semibold">
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
