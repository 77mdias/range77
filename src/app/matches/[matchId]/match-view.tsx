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
import type { MatchDetail, MatchScoreboardRow } from '@/contracts/tracker';
import {
  aggregateWeaponKills,
  computeFirstBloods,
  computeMatchHalves,
  computeTeamTotals,
  selectMatchMvp,
  type PlayerFirstBloods,
} from '@/services/analytics/match-breakdown';
import { computePerformanceRating } from '@/services/analytics/rating';
import { agentArtSrc, agentIconSrc, mapMinimapSrc } from '@/lib/valorant-assets';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * MatchView — apresentação PURA (síncrona) do detalhe de partida no design
 * Stitch: MatchMetaBar, ScoreBanner (neutro — sem perspectiva de jogador),
 * RoundTimeline, heatmap de rounds por abates, scoreboard duplo com FK/FD e
 * KAST computados dos eventos de abate (ECON fica `—`: a HenrikDev não
 * fornece), MVP da partida (maior ACS) com Rating ValCoach e metades DEF/ATK
 * inferidas dos plants, e eficiência por arma. Separada da página assíncrona
 * para ser testável com `renderToStaticMarkup`.
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

  // Metades DEF/ATK do time A (lado inferido dos plants; OT → omitido).
  const halves = teamA !== undefined ? computeMatchHalves(detail.rounds, teamA) : null;
  const halvesLabel =
    halves === null
      ? undefined
      : `DEF: ${halves.defense.won}-${halves.defense.lost} • ATK: ${halves.attack.won}-${halves.attack.lost}`;

  const roundsTotal = detail.rounds.length;
  const firstBloods = computeFirstBloods(detail.kills);
  const mvp = selectMatchMvp(detail.scoreboard);
  const weapons = aggregateWeaponKills(detail.kills);
  const mvpFirstBloods = mvp !== null ? firstBloods.get(mvp.puuid) : undefined;

  const ratingFor = (row: MatchScoreboardRow, fb: PlayerFirstBloods | undefined): number | null =>
    computePerformanceRating({
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
      rounds: roundsTotal,
      firstKills: fb?.firstBloods ?? null,
      kastPercentage: row.kastPercentage,
    });

  const teams = teamIds.map((teamId) => {
    const totals = computeTeamTotals(teamId, detail.scoreboard);
    const players = detail.scoreboard
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
          kastPercentage: row.kastPercentage,
          firstBloods: fb?.firstBloods,
          firstDeaths: fb?.firstDeaths,
          rating: ratingFor(row, fb),
        };
      });
    const ratings = players
      .map((player) => player.rating)
      .filter((rating): rating is number => rating !== null);
    const avgRating =
      ratings.length === 0
        ? undefined
        : Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) /
          100;

    return {
      name: `Time ${teamId}`,
      roundsWon: roundsWon(teamId),
      totalDamage: totals.totalDamage,
      avgRating,
      players,
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

      <div className="flex w-full flex-col gap-4 px-4 py-6 md:px-6 xl:px-8">
        {/* Hero (Stitch match): resultado final + MVP da partida */}
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ScoreBanner
              scoreTeam={scoreA}
              scoreEnemy={scoreB}
              map={detail.map}
              halves={halvesLabel}
              mapImageSrc={mapMinimapSrc(detail.map) ?? undefined}
            />
          </div>
          <div className="lg:col-span-8" data-mvp-slot>
            {mvp !== null ? (
              <MvpCallout
                playerName={mvp.tag === '' ? mvp.name : `${mvp.name}#${mvp.tag}`}
                agent={mvp.agent}
                rank={mvp.tier ?? undefined}
                portraitSrc={agentIconSrc(mvp.agent) ?? agentArtSrc(mvp.agent) ?? undefined}
                rating={ratingFor(mvp, mvpFirstBloods)}
                kills={mvp.kills}
                deaths={mvp.deaths}
                assists={mvp.assists}
                firstKills={mvpFirstBloods?.firstBloods ?? null}
                metrics={[
                  { label: 'ACS', value: String(mvp.acs) },
                  {
                    label: 'HS Rate',
                    value: mvp.hsPercentage === null ? '—' : `${mvp.hsPercentage}%`,
                  },
                  {
                    label: 'KAST',
                    value: mvp.kastPercentage === null ? '—' : `${mvp.kastPercentage}%`,
                  },
                ]}
              />
            ) : null}
          </div>
        </div>

        {/* Tabela telemétrica (scoreboard duplo com FK/FD real) */}
        <ScoreboardTable teams={teams} />

        {/* Timeline de rounds — mantida no formato atual (decisão do dono) */}
        <Card label={`Timeline de ${detail.rounds.length} rounds`}>
          {rounds.length === 0 ? (
            <p className="text-body text-text-secondary">Sem timeline de rounds.</p>
          ) : (
            <RoundTimeline rounds={rounds} />
          )}
        </Card>

        {teamA !== undefined ? (
          <Card label="Rounds por abates">
            <RoundHeatmap rounds={detail.rounds} kills={detail.kills} teamId={teamA} />
          </Card>
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
