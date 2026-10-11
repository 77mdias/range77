import { RoundHeatmap } from '@/components/charts';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import {
  MatchMetaBar,
  MvpCallout,
  RoundTimeline,
  ScoreBanner,
  ScoreboardTable,
  WeaponCard,
  type RoundCellData,
} from '@/components/match';
import type { MatchDetail } from '@/contracts/tracker';
import {
  aggregateWeaponKills,
  computeFirstBloods,
  computeTeamTotals,
  selectMatchMvp,
} from '@/services/analytics/match-breakdown';
import { agentArtSrc, agentIconSrc, mapMinimapSrc } from '@/lib/valorant-assets';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * MatchView — apresentação PURA (síncrona) do detalhe de partida no design
 * Stitch: MatchMetaBar, ScoreBanner (neutro — sem perspectiva de jogador),
 * RoundTimeline, heatmap de rounds por abates, scoreboard duplo com FK/FD
 * computado dos eventos de abate (KAST%/ECON ficam `—`: a HenrikDev não
 * fornece), MVP da partida (maior ACS) e eficiência por arma. Separada da
 * página assíncrona para ser testável com `renderToStaticMarkup`.
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

  const firstBloods = computeFirstBloods(detail.kills);
  const mvp = selectMatchMvp(detail.scoreboard);
  const weapons = aggregateWeaponKills(detail.kills);
  const mvpFirstBloods = mvp !== null ? firstBloods.get(mvp.puuid) : undefined;

  const teams = teamIds.map((teamId) => {
    const totals = computeTeamTotals(teamId, detail.scoreboard);
    return {
      name: `Time ${teamId}`,
      roundsWon: roundsWon(teamId),
      totalDamage: totals.totalDamage,
      players: detail.scoreboard
        .filter((row) => row.teamId === teamId)
        .map((row) => {
          const fb = firstBloods.get(row.puuid);
          return {
            name: row.name,
            tag: row.tag === '' ? undefined : row.tag,
            rank: row.tier ?? undefined,
            agent: row.agent,
            agentIconSrc: agentIconSrc(row.agent),
            acs: row.acs,
            kills: row.kills,
            deaths: row.deaths,
            assists: row.assists,
            kdDiff: row.kills - row.deaths,
            hsPercentage: row.hsPercentage,
            firstBloods: fb?.firstBloods,
            firstDeaths: fb?.firstDeaths,
          };
        }),
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
          `Match ID: ${detail.matchId}`,
        ]}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ScoreBanner
              scoreTeam={scoreA}
              scoreEnemy={scoreB}
              map={detail.map}
              mapImageSrc={mapMinimapSrc(detail.map) ?? undefined}
            />
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

        {mvp !== null ? (
          <MvpCallout
            playerName={mvp.tag === '' ? mvp.name : `${mvp.name}#${mvp.tag}`}
            agent={mvp.agent}
            rank={mvp.tier ?? undefined}
            portraitSrc={agentIconSrc(mvp.agent) ?? agentArtSrc(mvp.agent) ?? undefined}
            stats={[
              { label: 'K/D/A', value: `${mvp.kills}/${mvp.deaths}/${mvp.assists}` },
              { label: 'ACS', value: String(mvp.acs) },
              {
                label: 'HS',
                value: mvp.hsPercentage === null ? '—' : `${mvp.hsPercentage}%`,
              },
            ]}
            metrics={[
              { label: 'FB', value: String(mvpFirstBloods?.firstBloods ?? 0) },
              { label: 'FD', value: String(mvpFirstBloods?.firstDeaths ?? 0) },
              { label: 'Dano', value: mvp.damageDealt.toLocaleString('pt-BR') },
            ]}
          />
        ) : null}

        {weapons.length > 0 ? (
          <Card label="Eficiência por arma">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weapons.slice(0, 6).map((weapon, index) => (
                <WeaponCard
                  key={weapon.weapon}
                  name={weapon.weapon}
                  kills={weapon.kills}
                  primary={index === 0}
                  stats={[{ label: 'Share de abates', value: `${weapon.sharePercent}%` }]}
                />
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
