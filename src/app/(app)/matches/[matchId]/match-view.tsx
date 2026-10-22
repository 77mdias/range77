import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { minimapFor } from '@/lib/valorant-maps';
import { MatchRoundSelector } from './round-selector';
import {
  KillMap,
  MatchMetaBar,
  MvpCallout,
  RoundEconomy,
  RoundTimeline,
  ScoreBanner,
  ScoreboardTable,
  WeaponCard,
  type RoundCellData,
} from '@/components/match';
import type { MatchDetail, MatchScoreboardRow } from '@/contracts/tracker';
import {
  aggregateWeaponKills,
  computeAdr,
  computeFirstBloods,
  computeHalfSplits,
  computeMatchHalves,
  computeRankRange,
  computeRoundTimeline,
  computeTeamTotals,
  selectMatchMvp,
  type PlayerFirstBloods,
} from '@/services/analytics/match-breakdown';
import { computePerformanceRating } from '@/services/analytics/rating';
import { agentArtSrc, agentIconSrc, mapMinimapSrc, rankIconSrc } from '@/lib/valorant-assets';
import { SimulatedBadge } from '@/components/ui/simulated-badge';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * MatchView — apresentação PURA (síncrona) do detalhe de partida no design
 * Stitch: MatchMetaBar, ScoreBanner (perspectiva do jogador buscado quando
 * informado), tabela telemétrica com faixa de MMR e FK/FD/KAST computados dos
 * eventos, timeline de rounds classificada (tipo de encerramento, lado,
 * pistolas e placar progressivo), MVP da partida (maior ACS) com Rating
 * ValCoach/card do jogador, metades DEF/ATK e splits HALF-ONE/HALF-TWO do
 * time do jogador buscado e eficiência de arsenal do jogador (ou da partida,
 * sem perspectiva). A
 * HenrikDev v4 não fornece ECON rating nem dano por arma — esses campos ficam
 * `—`/omitidos, nunca inventados. Separada da página assíncrona para ser
 * testável com `renderToStaticMarkup`.
 */

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Riot ID completo de um jogador ("Nome#TAG") ou só o nome sem tag. */
function riotId(name: string, tag: string): string {
  return tag === '' ? name : `${name}#${tag}`;
}

/** Riot ID do jogador buscado — usado para "VOCÊ" e perspectiva W/L e DEF/ATK. */
export interface MatchViewer {
  readonly name: string;
  readonly tag: string;
}

export interface MatchViewProps {
  readonly detail: MatchDetail;
  /** Jogador buscado (vindo da query `?player=`) → destaca a linha e a perspectiva. */
  readonly viewer?: MatchViewer | null;
  /** Card in-game do MVP (quadrado); ausente → fallback ao ícone do agente. */
  readonly mvpCardSrc?: string | null;
  /** Fonte simulada → selo DADOS SIMULADOS junto à identidade da partida. */
  readonly simulated?: boolean;
}

export function MatchView({ detail, viewer, mvpCardSrc, simulated = false }: MatchViewProps) {
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

  // Jogador buscado (mesma referência do array do scoreboard) → perspectiva.
  const viewerRow =
    viewer == null
      ? null
      : (detail.scoreboard.find(
          (row) =>
            row.name.toLowerCase() === viewer.name.toLowerCase() &&
            row.tag.toLowerCase() === viewer.tag.toLowerCase(),
        ) ?? null);
  const viewerTeamId = viewerRow?.teamId;
  const hasPerspective = viewerTeamId !== undefined;
  const perspectiveTeamId = viewerTeamId ?? teamA;
  const opponentTeamId =
    perspectiveTeamId === undefined
      ? undefined
      : teamIds.find((id) => id !== perspectiveTeamId);

  const usScore = perspectiveTeamId !== undefined ? roundsWon(perspectiveTeamId) : 0;
  const themScore = opponentTeamId !== undefined ? roundsWon(opponentTeamId) : 0;
  const result: 'win' | 'loss' | undefined = hasPerspective
    ? usScore > themScore
      ? 'win'
      : usScore < themScore
        ? 'loss'
        : undefined
    : undefined;

  // Time do jogador buscado primeiro (aliado), adversário depois.
  const orderedTeamIds =
    hasPerspective && viewerTeamId !== undefined && teamIds.includes(viewerTeamId)
      ? [viewerTeamId, ...teamIds.filter((id) => id !== viewerTeamId)]
      : teamIds;

  // Timeline classificada na perspectiva do time do jogador buscado (teamA
  // como "casa" quando não há jogador informado).
  const timeline =
    perspectiveTeamId === undefined
      ? null
      : computeRoundTimeline(
          detail.rounds,
          detail.kills,
          detail.scoreboard,
          perspectiveTeamId,
        );
  const roundCells: readonly RoundCellData[] =
    timeline === null
      ? []
      : timeline.rounds.map((round) => ({
          number: round.roundNumber,
          won: round.won,
          side: round.side,
          kind: round.kind,
          pistol: round.pistol,
          score: `${round.score.us}-${round.score.them}`,
        }));

  // Metades DEF/ATK do time do jogador buscado (lado inferido dos plants;
  // OT → omitido). Sem jogador informado não há perspectiva — omitimos.
  const halves =
    hasPerspective && perspectiveTeamId !== undefined
      ? computeMatchHalves(detail.rounds, perspectiveTeamId)
      : null;
  const halvesLabel =
    halves === null
      ? undefined
      : `DEF: ${halves.defense.won}-${halves.defense.lost} • ATK: ${halves.attack.won}-${halves.attack.lost}`;

  // Rounds ganhos/perdidos por metade (HALF-ONE 1–12 / HALF-TWO 13+) do time do
  // jogador buscado — sempre computável do roundNumber; sem perspectiva omitida.
  const halfSplits =
    hasPerspective && perspectiveTeamId !== undefined
      ? computeHalfSplits(detail.rounds, perspectiveTeamId)
      : null;

  const roundsTotal = detail.rounds.length;
  const firstBloods = computeFirstBloods(detail.kills);
  const mvp = selectMatchMvp(detail.scoreboard);
  const rankRange = computeRankRange(detail.scoreboard);
  // Arsenal na perspectiva do jogador buscado (senão, partida inteira).
  const weapons = aggregateWeaponKills(detail.kills, viewerRow?.puuid);
  const mvpFirstBloods = mvp !== null ? firstBloods.get(mvp.puuid) : undefined;
  const arsenalLabel =
    viewerRow === null ? 'partida inteira' : riotId(viewerRow.name, viewerRow.tag);

  const ratingFor = (row: MatchScoreboardRow, fb: PlayerFirstBloods | undefined): number | null =>
    computePerformanceRating({
      kills: row.kills,
      deaths: row.deaths,
      assists: row.assists,
      rounds: roundsTotal,
      firstKills: fb?.firstBloods ?? null,
      kastPercentage: row.kastPercentage,
    });

  const teams = orderedTeamIds.map((teamId) => {
    const totals = computeTeamTotals(teamId, detail.scoreboard);
    const isViewerTeam = teamId === viewerTeamId;
    const opponent = teamIds.find((id) => id !== teamId);
    const won =
      opponent === undefined ? undefined : roundsWon(teamId) > roundsWon(opponent);
    const players = detail.scoreboard
      .filter((row) => row.teamId === teamId)
      .map((row) => {
        const fb = firstBloods.get(row.puuid);
        return {
          name: row.name,
          tag: row.tag === '' ? undefined : row.tag,
          rank: row.tier ?? undefined,
          rankIconSrc: row.tier === null ? null : rankIconSrc(row.tier),
          agent: row.agent,
          agentIconSrc: agentIconSrc(row.agent),
          acs: row.acs,
          kills: row.kills,
          deaths: row.deaths,
          assists: row.assists,
          kdDiff: row.kills - row.deaths,
          adr: computeAdr(row.damageDealt, roundsTotal),
          hsPercentage: row.hsPercentage,
          kastPercentage: row.kastPercentage,
          firstBloods: fb?.firstBloods,
          firstDeaths: fb?.firstDeaths,
          rating: ratingFor(row, fb),
          isViewer: row === viewerRow,
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

    const label = isViewerTeam
      ? 'Time aliado'
      : hasPerspective
        ? 'Time adversário'
        : `Time ${teamId}`;

    return {
      name: `Time ${teamId}`,
      label,
      won,
      roundsWon: roundsWon(teamId),
      totalDamage: totals.totalDamage,
      avgRating,
      isViewerTeam,
      players,
    };
  });

  // Mapa de abates só com minimapa conhecido E posições reais nos abates.
  const sortedRounds = [...detail.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const showKillMap =
    sortedRounds.length > 0 &&
    minimapFor(detail.mapId ?? detail.map) !== null &&
    detail.kills.some((kill) => kill.victimLocation != null);

  return (
    <div data-match-detail className="flex flex-col">
      {simulated ? (
        <div className="border-b border-line bg-surface px-4 py-2 md:px-6 xl:px-8">
          <SimulatedBadge />
        </div>
      ) : null}
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
              result={result}
              scoreTeam={usScore}
              scoreEnemy={themScore}
              map={detail.map}
              halves={halvesLabel}
              halfSplits={halfSplits}
              mapImageSrc={mapMinimapSrc(detail.map) ?? undefined}
            />
          </div>
          <div className="lg:col-span-8" data-mvp-slot>
            {mvp !== null ? (
              <MvpCallout
                playerName={riotId(mvp.name, mvp.tag)}
                agent={mvp.agent}
                rank={mvp.tier ?? undefined}
                rankImageSrc={
                  mvp.tier === null ? undefined : (rankIconSrc(mvp.tier) ?? undefined)
                }
                portraitSrc={
                  mvpCardSrc ?? agentIconSrc(mvp.agent) ?? agentArtSrc(mvp.agent) ?? undefined
                }
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

        {/* Tabela telemétrica (scoreboard duplo alinhado, faixa de MMR, VOCÊ) */}
        <ScoreboardTable teams={teams} rankRange={rankRange} />

        {/* Timeline de rounds classificada (Stitch "PLACAR DE ROUNDS") */}
        <Card>
          {roundCells.length === 0 ? (
            <p className="text-body text-text-secondary">Sem timeline de rounds.</p>
          ) : (
            <RoundTimeline rounds={roundCells} summary={timeline?.summary} />
          )}
        </Card>

        {/* Mapa de abates por round (só fontes com posições: Riot/mock) */}
        {showKillMap ? (
          <Card label="// Mapa de abates • posições no instante de cada abate">
            <MatchRoundSelector
              rounds={sortedRounds.map((round) => ({
                id: String(round.roundNumber),
                label: `R${round.roundNumber}`,
              }))}
              panels={sortedRounds.map((round) => (
                <KillMap
                  key={round.roundNumber}
                  detail={detail}
                  roundNumber={round.roundNumber}
                  focusPuuid={viewerRow?.puuid}
                />
              ))}
            />
          </Card>
        ) : null}

        {/* Economia por round (só fontes com economia: Riot/mock) */}
        {(detail.economy?.length ?? 0) > 0 ? (
          <Card label="// Economia por round • loadout, gasto e sobra">
            <div className="flex flex-col gap-6">
              {teams.map((team, index) => (
                <RoundEconomy
                  key={orderedTeamIds[index]}
                  detail={detail}
                  teamId={orderedTeamIds[index] ?? ''}
                  label={team.label}
                  focusPuuid={viewerRow?.puuid}
                />
              ))}
            </div>
          </Card>
        ) : null}

        {/* Eficiência de arsenal do jogador buscado (ou da partida, sem ele) */}
        {weapons.length > 0 ? (
          <div data-match-arsenal>
            <Card
              label={`// Eficiência de arsenal • ${arsenalLabel}`}
              action={
                <span className="font-hud text-label-xs uppercase text-text-secondary">
                  {weapons.length} arma(s) com abate
                </span>
              }
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {weapons.slice(0, 8).map((weapon, index) => (
                  <WeaponCard
                    key={weapon.weapon}
                    name={weapon.weapon}
                    kills={weapon.kills}
                    primary={index === 0}
                    meter={{
                      value: weapon.sharePercent,
                      label: `Share ${weapon.sharePercent}%`,
                    }}
                    stats={[
                      { label: 'First kills', value: String(weapon.firstKills) },
                      { label: 'Rounds com abate', value: String(weapon.rounds) },
                    ]}
                  />
                ))}
              </div>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
