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
 * MatchHistoryTable — histórico recente em tabela compacta (overview
 * Stitch): status, agente, mapa, placar, K/D/A, K/D, ACS, HS% e RR delta.
 * Linhas viram link quando `href` presente.
 */

export interface MatchHistoryEntry {
  readonly id: string;
  /** Indisponível em alguns payloads → renderiza `—`. */
  readonly agent?: string | null;
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
  ariaLabel = 'Histórico recente de partidas',
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
            <TableHeaderCell numeric>Placar</TableHeaderCell>
            <TableHeaderCell numeric>K/D/A</TableHeaderCell>
            <TableHeaderCell numeric>K/D</TableHeaderCell>
            <TableHeaderCell numeric>ACS</TableHeaderCell>
            <TableHeaderCell numeric>HS%</TableHeaderCell>
            <TableHeaderCell numeric>RR</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {matches.map((match) => {
            const win = match.result === 'win';
            const row = (
              <>
                <TableCell>
                  <Badge variant={win ? 'win' : 'loss'}>{win ? 'Vitória' : 'Derrota'}</Badge>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span aria-hidden="true" className="size-2 rounded-full bg-text-primary" />
                    {match.agent ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="font-hud text-label">{match.map}</TableCell>
                <TableCell numeric className="font-hud font-semibold">
                  {match.scoreTeam}–{match.scoreEnemy}
                </TableCell>
                <TableCell numeric className="font-hud text-label">
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
              </>
            );

            if (match.href === undefined) {
              return <TableRow key={match.id}>{row}</TableRow>;
            }

            // Linha clicável via stretched-link (pseudo-elemento cobre a
            // linha inteira) — mantém o HTML da tabela válido.
            return (
              <TableRow key={match.id} className="relative">
                {row}
                <a
                  href={match.href}
                  aria-label={`Detalhes da partida em ${match.map}`}
                  data-match-history-link
                  className="absolute inset-0 after:absolute after:inset-0"
                />
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
