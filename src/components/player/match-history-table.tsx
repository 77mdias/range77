import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { cx } from '@/lib/cx';
import type { MatchResult } from '@/components/ui/match-row';

/**
 * MatchHistoryTable — últimas partidas jogadas em tabela compacta (overview
 * Stitch): status, agente, mapa, placar, K/D/A, K/D, ACS, HS% e RR delta.
 * Linhas viram link quando `href` presente.
 */

export interface MatchHistoryEntry {
  readonly id: string;
  /** Indisponível em alguns payloads → renderiza `—`. */
  readonly agent?: string | null;
  /** Ícone do agente (asset local); ausente → marcador neutro. */
  readonly agentIconSrc?: string | null;
  readonly map: string;
  readonly result: MatchResult;
  readonly scoreTeam: number;
  readonly scoreEnemy: number;
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  /** K/D pronto (analytics); ausente → `—`. */
  readonly kd?: number;
  readonly acs: number;
  readonly hsPercentage?: number | null;
  /** Delta RR quando a fila expõe elo (HenrikDev nem sempre traz). */
  readonly rrDelta?: number;
  readonly href?: string;
}

export interface MatchHistoryTableProps {
  readonly matches: readonly MatchHistoryEntry[];
  readonly ariaLabel?: string;
  readonly className?: string;
}

function formatKd(kd: number): string {
  return kd.toFixed(2);
}

export function MatchHistoryTable({
  matches,
  ariaLabel = 'Últimas partidas jogadas',
  className,
}: MatchHistoryTableProps) {
  if (matches.length === 0) {
    return (
      <EmptyState
        title="Sem partidas"
        description="Nenhuma partida encontrada para este jogador."
      />
    );
  }

  return (
    <div className={cx('w-full overflow-x-auto', className)}>
      <Table aria-label={ariaLabel} data-component="match-history-table">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Agente</TableHeaderCell>
            <TableHeaderCell>Mapa</TableHeaderCell>
            <TableHeaderCell>Placar</TableHeaderCell>
            <TableHeaderCell>K/D/A</TableHeaderCell>
            <TableHeaderCell numeric>K/D</TableHeaderCell>
            <TableHeaderCell numeric>ACS</TableHeaderCell>
            <TableHeaderCell numeric>HS%</TableHeaderCell>
            <TableHeaderCell numeric>RR</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map((match) => {
            const win = match.result === 'win';
            // `<tr>` só pode conter <td>/<th>: o link de linha vive DENTRO da
            // primeira célula. Com `absolute inset-0` ele cobre a linha inteira
            // (containing block = o <tr> posicionado) — HTML válido com o alvo
            // de clique preservado.
            const rowLink =
              match.href === undefined ? null : (
                <a
                  href={match.href}
                  aria-label={`Detalhes da partida em ${match.map}`}
                  data-match-history-link
                  className="absolute inset-0"
                />
              );

            return (
              <TableRow
                key={match.id}
                className={match.href === undefined ? undefined : 'relative'}
              >
                <TableCell>
                  <Badge variant={win ? 'win' : 'loss'}>{win ? 'Vitória' : 'Derrota'}</Badge>
                  {rowLink}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 font-semibold">
                    {match.agentIconSrc !== undefined && match.agentIconSrc !== null ? (
                      // eslint-disable-next-line @next/next/no-img-element -- ícone local do agente
                      <img
                        src={match.agentIconSrc}
                        alt=""
                        className="size-4 rounded-full border border-line object-cover"
                      />
                    ) : (
                      <span aria-hidden="true" className="size-2 rounded-full bg-text-primary" />
                    )}
                    {match.agent ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="font-hud text-label">{match.map}</TableCell>
                <TableCell className="font-hud font-semibold">
                  {match.scoreTeam}–{match.scoreEnemy}
                </TableCell>
                <TableCell className="font-hud text-label">
                  {match.kills}/{match.deaths}/{match.assists}
                </TableCell>
                <TableCell
                  numeric
                  className={cx(
                    'font-hud font-semibold',
                    match.kd === undefined
                      ? 'text-text-secondary'
                      : match.kd >= 1
                        ? 'text-win'
                        : 'text-text-secondary',
                  )}
                >
                  {match.kd !== undefined ? formatKd(match.kd) : '—'}
                </TableCell>
                <TableCell numeric className="font-hud">
                  {match.acs}
                </TableCell>
                <TableCell numeric className="font-hud">
                  {match.hsPercentage ?? '—'}
                </TableCell>
                <TableCell
                  numeric
                  className={cx(
                    'font-hud font-semibold',
                    match.rrDelta === undefined
                      ? 'text-text-secondary'
                      : match.rrDelta >= 0
                        ? 'text-text-primary'
                        : 'text-loss',
                  )}
                >
                  {match.rrDelta === undefined
                    ? '—'
                    : match.rrDelta >= 0
                      ? `+${match.rrDelta}`
                      : match.rrDelta}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
