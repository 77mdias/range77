import { RoundHeatmap } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import {
  MatchMetaBar,
  RoundTimeline,
  ScoreBanner,
  ScoreboardTable,
  type RoundCellData,
} from '@/components/match';
import type { MatchDetail } from '@/contracts/tracker';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * MatchView — apresentação PURA (síncrona) do detalhe de partida no design
 * Stitch: MatchMetaBar, ScoreBanner (neutro — sem perspectiva de jogador),
 * RoundTimeline, heatmap de rounds por abates e scoreboard duplo via o
 * componente `ScoreboardTable` do design system. Separada da página
 * assíncrona para ser testável com `renderToStaticMarkup`.
 */

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

  const rounds: readonly RoundCellData[] = detail.rounds.map((round) => ({
    number: round.roundNumber,
    outcome: round.winningTeamId === teamA ? 'win' : 'loss',
  }));

  const teams = teamIds.map((teamId) => {
    const declared = detail.teams.find((team) => team.teamId === teamId);
    return {
      name: `Time ${teamId}`,
      roundsWon: roundsWon(teamId),
      players: detail.scoreboard
        .filter((row) => row.teamId === teamId)
        .map((row) => ({
          name: row.name,
          tag: row.tag === '' ? undefined : row.tag,
          rank: row.tier ?? undefined,
          agent: row.agent,
          acs: row.acs,
          kills: row.kills,
          deaths: row.deaths,
          assists: row.assists,
          kdDiff: row.kills - row.deaths,
          hsPercentage: row.hsPercentage,
        })),
    };
  });

  return (
    <div data-match-detail className="flex flex-col">
      <MatchMetaBar
        queue={detail.queue.toUpperCase()}
        map={detail.map}
        details={[
          `Duração: ${formatDuration(detail.gameLengthMs)}`,
          `Jogada: ${formatRelativeTime(detail.startedAt)}`,
          `Região: ${detail.region.toUpperCase()}`,
          `Season: ${detail.season ?? 'Ato atual'}`,
        ]}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ScoreBanner scoreTeam={scoreA} scoreEnemy={scoreB} map={detail.map} />
          </div>
          <div className="lg:col-span-8" data-round-strip>
            <Card label={`Timeline de ${detail.rounds.length} rounds`}>
              {rounds.length === 0 ? (
                <p className="text-body text-text-secondary">Sem timeline de rounds.</p>
              ) : (
                <RoundTimeline rounds={rounds} />
              )}
            </Card>
          </div>
        </div>

        {teamA !== undefined ? (
          <Card label="Rounds por abates">
            <RoundHeatmap rounds={detail.rounds} kills={detail.kills} teamId={teamA} />
          </Card>
        ) : null}

        <ScoreboardTable teams={teams} />
      </div>
    </div>
  );
}
