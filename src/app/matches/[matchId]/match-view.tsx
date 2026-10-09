import { Badge } from '@/components/ui/badge';
import { RoundHeatmap } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import type { MatchDetail, MatchScoreboardRow } from '@/contracts/tracker';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * MatchView — apresentação PURA (síncrona) do detalhe de partida: header,
 * placar por time, faixa round-a-round (W/L com Badges) e scoreboard duplo.
 * Separada da página assíncrona para ser testável com `renderToStaticMarkup`.
 */

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function ScoreboardTable({
  rows,
  teamId,
}: {
  readonly rows: readonly MatchScoreboardRow[];
  readonly teamId: string;
}) {
  const teamRows = rows.filter((row) => row.teamId === teamId);
  if (teamRows.length === 0) {
    return null;
  }

  return (
    <Table aria-label={`Scoreboard do time ${teamId}`}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Jogador</TableHeaderCell>
          <TableHeaderCell>Agente</TableHeaderCell>
          <TableHeaderCell>Tier</TableHeaderCell>
          <TableHeaderCell numeric>K/D/A</TableHeaderCell>
          <TableHeaderCell numeric>ACS</TableHeaderCell>
          <TableHeaderCell numeric>HS%</TableHeaderCell>
          <TableHeaderCell numeric>Dano</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {teamRows.map((row) => (
          <TableRow key={row.puuid}>
            <TableCell>
              {row.name}
              {row.tag !== '' ? <span className="text-text-secondary">#{row.tag}</span> : null}
            </TableCell>
            <TableCell>{row.agent}</TableCell>
            <TableCell>{row.tier ?? '—'}</TableCell>
            <TableCell numeric>
              {row.kills}/{row.deaths}/{row.assists}
            </TableCell>
            <TableCell numeric>{row.acs}</TableCell>
            <TableCell numeric>{formatPct(row.hsPercentage)}</TableCell>
            <TableCell numeric>{row.damageDealt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function MatchView({ detail }: { readonly detail: MatchDetail }) {
  const teamIds =
    detail.teams.length > 0
      ? detail.teams.map((team) => team.teamId)
      : [...new Set(detail.scoreboard.map((row) => row.teamId))];

  if (teamIds.length === 0) {
    return (
      <EmptyState
        title="Sem dados da partida"
        description="O payload da partida não trouxe times/jogadores."
      />
    );
  }

  const [teamA, teamB] = teamIds;
  const roundsWon = (teamId: string): number => {
    const declared = detail.teams.find((team) => team.teamId === teamId);
    if (declared !== undefined) {
      return declared.roundsWon;
    }
    return detail.rounds.filter((round) => round.winningTeamId === teamId).length;
  };

  const scoreA = teamA !== undefined ? roundsWon(teamA) : 0;
  const scoreB = teamB !== undefined ? roundsWon(teamB) : 0;

  return (
    <div data-match-detail className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 border-b border-line pb-4">
        <p className="text-label uppercase text-accent">
          {detail.queue} · {detail.season ?? 'Ato atual'}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-display-md uppercase text-text-primary">{detail.map}</h1>
          <p className="font-hud text-body-lg text-text-primary" data-match-score>
            <span className={scoreA >= scoreB ? 'text-win' : 'text-text-primary'}>
              {teamA ?? '—'} {scoreA}
            </span>
            <span className="text-text-secondary"> — </span>
            <span className={scoreB >= scoreA ? 'text-win' : 'text-text-primary'}>
              {scoreB} {teamB ?? '—'}
            </span>
          </p>
        </div>
        <time className="text-body text-text-secondary">
          {formatRelativeTime(detail.startedAt)}
        </time>
      </header>

      <Card label="Rounds">
        <div className="flex flex-wrap gap-1" data-round-strip>
          {detail.rounds.length === 0 ? (
            <p className="text-body text-text-secondary">Sem timeline de rounds.</p>
          ) : (
            detail.rounds.map((round) => (
              <Badge
                key={round.roundNumber}
                variant={round.winningTeamId === teamA ? 'win' : 'loss'}
              >
                {round.roundNumber}
                {round.plantSite !== null ? ` · ${round.plantSite}` : ''}
              </Badge>
            ))
          )}
        </div>
        <p className="mt-3 text-label uppercase text-text-secondary">
          Vitória do time:{' '}
          <span className="text-win">{teamA ?? '—'}</span> (verde) ·{' '}
          <span className="text-loss">{teamB ?? '—'}</span> (vermelho)
        </p>
      </Card>

      {teamA !== undefined ? (
        <Card label="Rounds por abates">
          <RoundHeatmap rounds={detail.rounds} kills={detail.kills} teamId={teamA} />
        </Card>
      ) : null}

      {teamIds.map((teamId) => (
        <section key={teamId} className="flex flex-col gap-2">
          <h2 className="font-display text-heading-sm uppercase text-text-primary">Time {teamId}</h2>
          <ScoreboardTable rows={detail.scoreboard} teamId={teamId} />
        </section>
      ))}
    </div>
  );
}
