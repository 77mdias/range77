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
  readonly acs: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly kdDiff: number;
  /** HS% computável; `null`/ausente → `—`. */
  readonly hsPercentage?: number | null;
  readonly firstBloods?: number;
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
                  <TableCell className="font-hud text-label uppercase">{player.agent}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}

      <footer className="mt-2 flex items-center gap-2 border-t border-line pt-2 font-hud text-label uppercase text-text-secondary">
        <Badge variant="neutral">Formato Riot V3</Badge>
        Clique na linha para replay telemétrico
      </footer>
    </div>
  );
}
