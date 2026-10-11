import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { cx } from '@/lib/cx';

/**
 * ScoreboardTable — tabela telemétrica completa da partida (detalhe):
 * header por time com resumo (rating/econ/dano) e linhas de jogadores.
 */

export interface ScoreboardPlayer {
  readonly name: string;
  readonly tag?: string;
  readonly rank?: string;
  readonly agent: string;
  /** Ícone do agente (asset local); ausente → iniciais. */
  readonly agentIconSrc?: string | null;
  readonly acs: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly kdDiff: number;
  /** HS% computável; `null`/ausente → `—`. */
  readonly hsPercentage?: number | null;
  /** KAST% (HenrikDev não fornece); `null`/ausente → `—`. */
  readonly kastPercentage?: number | null;
  /** First bloods computados dos eventos de abate. */
  readonly firstBloods?: number;
  /** First deaths computados dos eventos de abate. */
  readonly firstDeaths?: number;
  /** ECON rating (HenrikDev v4 não fornece); `null`/ausente → `—`. */
  readonly econRating?: number | null;
  readonly avgDamage?: number;
}

export interface ScoreboardTeam {
  readonly name: string;
  readonly won?: boolean;
  readonly roundsWon?: number;
  readonly avgRating?: number;
  readonly econRating?: number;
  readonly totalDamage?: number;
  readonly players: readonly ScoreboardPlayer[];
}

export interface ScoreboardTableProps {
  readonly teams: readonly ScoreboardTeam[];
  readonly ariaLabel?: string;
  readonly className?: string;
}

export function ScoreboardTable({ teams, ariaLabel, className }: ScoreboardTableProps) {
  return (
    <div
      data-component="scoreboard-table"
      className={cx('rounded-md border border-line bg-surface-raised p-3', className)}
    >
      {teams.map((team) => (
        <section key={team.name} className="mb-4 last:mb-0" data-scoreboard-team={team.name}>
          <header className="mb-2 flex flex-wrap items-center justify-between gap-2 border border-line bg-surface px-3 py-1.5 font-hud text-label uppercase text-text-primary">
            <span className="flex items-center gap-2 tracking-wide">
              <span aria-hidden="true" className="size-2.5 bg-text-primary" />
              <strong>
                {team.name}
                {team.roundsWon !== undefined ? ` • ${team.roundsWon} ROUNDS` : ''}
              </strong>
            </span>
            <span className="text-text-secondary">
              {team.avgRating !== undefined ? (
                <>
                  Rating médio: <strong className="text-text-primary">{team.avgRating.toFixed(2)}</strong> •{' '}
                </>
              ) : null}
              {team.econRating !== undefined ? (
                <>
                  Econ: <strong className="text-text-primary">{team.econRating.toFixed(1)}</strong> •{' '}
                </>
              ) : null}
              {team.totalDamage !== undefined ? (
                <>
                  Dano total: <strong className="text-text-primary">{team.totalDamage.toLocaleString('pt-BR')}</strong>
                </>
              ) : null}
            </span>
          </header>

          <Table aria-label={`Placar do time ${team.name}`}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Jogador</TableHeaderCell>
                <TableHeaderCell>Agente</TableHeaderCell>
                <TableHeaderCell numeric>ACS</TableHeaderCell>
                <TableHeaderCell numeric>K/D/A</TableHeaderCell>
                <TableHeaderCell numeric>+/-</TableHeaderCell>
                <TableHeaderCell numeric>HS%</TableHeaderCell>
                <TableHeaderCell numeric>KAST%</TableHeaderCell>
                <TableHeaderCell numeric>FK/FD</TableHeaderCell>
                <TableHeaderCell numeric>ECON</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {team.players.map((player) => (
                <TableRow key={`${team.name}:${player.name}:${player.tag ?? ''}`}>
                  <TableCell>
                    <span className="font-semibold">{player.name}</span>
                    {player.tag !== undefined ? (
                      <span className="text-text-secondary">#{player.tag}</span>
                    ) : null}
                    {player.rank !== undefined ? (
                      <span className="ml-2 font-hud text-label uppercase text-text-secondary">
                        {player.rank}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {player.agentIconSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element -- ícone local do agente
                        <img
                          src={player.agentIconSrc}
                          alt=""
                          className="size-5 rounded-full border border-line object-cover"
                        />
                      ) : null}
                      <span className="font-hud text-label uppercase">{player.agent}</span>
                    </span>
                  </TableCell>
                  <TableCell numeric>{player.acs}</TableCell>
                  <TableCell numeric className="font-hud text-label">
                    {player.kills}/{player.deaths}/{player.assists}
                  </TableCell>
                  <TableCell
                    numeric
                    className={cx(
                      'font-hud font-semibold',
                      player.kdDiff >= 0 ? 'text-win' : 'text-loss',
                    )}
                  >
                    {player.kdDiff >= 0 ? `+${player.kdDiff}` : player.kdDiff}
                  </TableCell>
                  <TableCell numeric>{player.hsPercentage == null ? '—' : `${player.hsPercentage}%`}</TableCell>
                  <TableCell numeric>{player.kastPercentage == null ? '—' : `${player.kastPercentage}%`}</TableCell>
                  <TableCell numeric className="font-hud">
                    {player.firstBloods === undefined && player.firstDeaths === undefined
                      ? '—'
                      : `${player.firstBloods ?? 0}/${player.firstDeaths ?? 0}`}
                  </TableCell>
                  <TableCell numeric>{player.econRating == null ? '—' : player.econRating.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}

      <footer className="mt-2 flex items-center gap-2 border-t border-line pt-2 font-hud text-label uppercase text-text-secondary">
        <Badge variant="neutral">Fonte: HenrikDev v4</Badge>
        Scoreboard normalizado — KAST/Rating computados dos eventos; ECON indisponível na fonte
      </footer>
    </div>
  );
}
