import type {
  RiotAccountDto,
  RiotDamageDto,
  RiotEconomyDto,
  RiotKillDto,
  RiotLocationDto,
  RiotMatchDto,
  RiotPlayerDto,
  RiotPlayerLocationsDto,
  RiotPlayerRoundStatsDto,
  RiotRoundResultDto,
} from '@/contracts/riot';
import type { MapZone } from '@/contracts/tracker';
import {
  CREDIT_CAP,
  KILL_REWARD,
  OVERTIME_CREDITS,
  PISTOL_CREDITS,
  PLANT_REWARD,
  WIN_REWARD,
  buyLoadout,
  buyTypeForCredits,
  lossBonus,
  type KeptLoadout,
  type Purchase,
} from './economy';
import {
  MOCK_ANCHOR_MILLIS,
  MOCK_QUEUE_ID,
  MOCK_SEASON_ID,
  generateAccount,
  generateRankSnapshot,
  mockMatchIndex,
  mockMatchStart,
  mockTierAtMatch,
} from './generate-account';
import { MOCK_MAPS, type MockMap } from './map-zones';
import { otherTeam, planMatch, type TeamId } from './match-plan';
import { MOCK_AGENTS, MOCK_ROSTER, type MockAgent } from './roster';
import { createRng, mockUuid, seedOf, shuffle, weightedPick, type Rng } from './rng';

/**
 * Gerador de uma partida competitiva SIMULADA no formato oficial
 * VAL-MATCH-V1 (`RiotMatchDto`). Determinístico: (matchId, foco) → mesma
 * partida byte a byte. O roteiro (mapa, vencedor, placar) vem de
 * `planMatch`; aqui ele é encenado round a round com abates, posições,
 * plant/defuse e economia coerentes entre si.
 *
 * Fora do escopo (não existe na API oficial): linha do tempo de
 * habilidades. `AbilityDto` por round sai com os quatro campos `null`; só
 * há contagem agregada de casts na partida (`abilityCasts`).
 */

const REGION = 'br';
const GAME_VERSION = 'release-11.08-shipping-14-000000';
const GAME_MODE = '/Game/GameModes/Bomb/BombGameMode.BombGameMode_C';
const PLAYER_CARD = '9fb348bc-41a0-91ad-8a3e-818035c4e561';
const PLAYER_TITLE = 'd13e579c-435e-44d4-cec2-6eae5a3c5ed4';

const BUY_PHASE_MILLIS = 30_000;
const POST_ROUND_MILLIS = 7_000;
const SPIKE_MILLIS = 45_000;
const KILL_MIN_MILLIS = 5_000;
const KILL_MAX_MILLIS = 99_000;
const DAY = 86_400_000;

const NULL_ABILITY = { grenadeEffects: null, ability1Effects: null, ability2Effects: null, ultimateEffects: null } as const;

type Outcome = 'Elimination' | 'Detonate' | 'Defuse';

const RESULT_LABEL: Record<Outcome, string> = {
  Elimination: 'Eliminated',
  Detonate: 'Bomb detonated',
  Defuse: 'Bomb defused',
};

interface Slot {
  readonly puuid: string;
  readonly gameName: string;
  readonly tagLine: string;
  readonly teamId: TeamId;
  readonly agent: MockAgent;
  readonly tier: number;
  readonly skill: number;
  readonly sniper: boolean;
  readonly accountLevel: number;
  partyId: string;
}

function at<T>(items: readonly T[], i: number): T {
  const v = items[i];
  if (v === undefined) throw new Error(`mock: índice fora do intervalo (${i})`);
  return v;
}

/** Atacante do round: Red no 1º tempo, Blue no 2º, alternando no overtime. */
export function attackersOf(roundNum: number): TeamId {
  if (roundNum < 12) return 'Red';
  if (roundNum < 24) return 'Blue';
  return roundNum % 2 === 0 ? 'Red' : 'Blue';
}

const regionOf = (zone: MapZone): string => zone.label.split(' ')[0] ?? '';

function zonesFor(map: MockMap, side: 'attack' | 'defense', site: string): readonly MapZone[] {
  const bySide = map.zones.filter((z) => z.side === 'any' || z.side === side);
  const near = bySide.filter((z) => regionOf(z) === site || regionOf(z) === 'Mid');
  return near.length > 0 ? near : bySide;
}

/** Ponto uniforme dentro do retângulo da zona, com margem (sempre interno). */
function pointIn(rng: Rng, zone: MapZone): RiotLocationDto {
  const xs = zone.polygon.map((p) => p.x);
  const ys = zone.polygon.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const mx = (x1 - x0) * 0.15;
  const my = (y1 - y0) * 0.15;
  return {
    x: Math.round(x0 + mx + rng.next() * (x1 - x0 - 2 * mx)),
    y: Math.round(y0 + my + rng.next() * (y1 - y0 - 2 * my)),
  };
}

/** `k` tempos estritamente crescentes em [lo, hi] (+k ms de folga no pior caso). */
function sortedTimes(rng: Rng, lo: number, hi: number, k: number): number[] {
  const raw = Array.from({ length: k }, () => rng.int(lo, Math.max(lo, hi))).sort((a, b) => a - b);
  for (let i = 1; i < raw.length; i += 1) {
    if (at(raw, i) <= at(raw, i - 1)) raw[i] = at(raw, i - 1) + 1;
  }
  return raw;
}

function buildLobby(rng: Rng, focus: RiotAccountDto, focusTeam: TeamId, focusTier: number): Slot[] {
  const focusKey = `${focus.gameName ?? ''}#${focus.tagLine ?? ''}`.toLowerCase();
  const pool = MOCK_ROSTER.filter(
    (p) =>
      `${p.gameName}#${p.tagLine}`.toLowerCase() !== focusKey &&
      generateAccount(p.gameName, p.tagLine).puuid !== focus.puuid,
  );
  const lobby = shuffle(rng, pool).slice(0, 9);
  const taken: Record<TeamId, Set<string>> = { Red: new Set(), Blue: new Set() };
  const chooseAgent = (team: TeamId, mains: readonly string[], weights: readonly number[]): MockAgent => {
    const free = MOCK_AGENTS.filter((a) => !taken[team].has(a.name));
    const preferred = mains.flatMap((m, i) => {
      const agent = free.find((a) => a.name === m);
      return agent ? [{ agent, w: weights[i] ?? 1 }] : [];
    });
    const agent =
      preferred.length > 0 && rng.next() < 0.85
        ? weightedPick(rng, preferred, (p) => p.w).agent
        : rng.pick(free);
    taken[team].add(agent.name);
    return agent;
  };
  const clampTier = (t: number): number => Math.max(3, Math.min(24, t));

  // Mains do foco: 3 agentes fixos por conta (o perfil tem "agente favorito").
  const focusMains = shuffle(createRng(seedOf('mains', focus.puuid)), MOCK_AGENTS)
    .slice(0, 3)
    .map((a) => a.name);
  const slots: Slot[] = [
    {
      puuid: focus.puuid,
      gameName: focus.gameName ?? 'Jogador',
      tagLine: focus.tagLine ?? '0000',
      teamId: focusTeam,
      agent: chooseAgent(focusTeam, focusMains, [5, 3, 2]),
      tier: focusTier,
      skill: 0.85 + rng.next() * 0.5,
      sniper: rng.next() < 0.15,
      accountLevel: createRng(seedOf('level', focus.puuid)).int(40, 380),
      partyId: mockUuid(rng),
    },
  ];
  lobby.forEach((p, i) => {
    const teamId = i < 4 ? focusTeam : otherTeam(focusTeam);
    const account = generateAccount(p.gameName, p.tagLine);
    slots.push({
      puuid: account.puuid,
      gameName: p.gameName,
      tagLine: p.tagLine,
      teamId,
      agent: chooseAgent(teamId, p.mains, [3, 2]),
      tier: clampTier(focusTier + rng.int(-2, 2)),
      skill: 0.6 + rng.next() * 0.8,
      sniper: rng.next() < 0.15,
      accountLevel: createRng(seedOf('level', account.puuid)).int(20, 420),
      partyId: mockUuid(rng),
    });
  });
  // Às vezes o foco joga em duo com um colega de time.
  if (rng.next() < 0.35) {
    const mate = rng.pick(slots.filter((s) => s.teamId === focusTeam && s.puuid !== focus.puuid));
    mate.partyId = at(slots, 0).partyId;
  }
  // Ordem estável: Blue depois Red, embaralhado dentro do time.
  return [
    ...shuffle(rng, slots.filter((s) => s.teamId === 'Blue')),
    ...shuffle(rng, slots.filter((s) => s.teamId === 'Red')),
  ];
}

interface RoundAcc {
  kills: number;
  deaths: number;
  assists: number;
  score: number;
}

export function generateMatch(matchId: string, focus: RiotAccountDto): RiotMatchDto {
  const id = matchId.toLowerCase();
  const plan = planMatch(id);
  const rng = createRng(seedOf('detail', id));
  const map = at(MOCK_MAPS, plan.mapIndex);
  const index = mockMatchIndex(id, focus);
  const fallbackStart = MOCK_ANCHOR_MILLIS - rng.int(1, 60) * DAY;
  const gameStart = index === null ? fallbackStart : mockMatchStart(focus, index);
  const focusTier = index === null ? generateRankSnapshot(focus).competitiveTier : mockTierAtMatch(focus, index);

  const slots = buildLobby(rng, focus, plan.focusTeam, focusTier);
  const teamOf = (team: TeamId): Slot[] => slots.filter((s) => s.teamId === team);
  const sites = map.zones.filter((z) => z.label.endsWith(' Site')).map(regionOf);

  const credits = new Map<string, number>();
  const kept = new Map<string, KeptLoadout | null>();
  const lossStreak: Record<TeamId, number> = { Red: 0, Blue: 0 };
  const totals = new Map<string, RoundAcc>(slots.map((s) => [s.puuid, { kills: 0, deaths: 0, assists: 0, score: 0 }]));

  const rounds: RiotRoundResultDto[] = [];
  let offset = 0;

  plan.roundWinners.forEach((winner, r) => {
    const attackers = attackersOf(r);
    const defenders = otherTeam(attackers);
    const loser = otherTeam(winner);
    const isPistol = r === 0 || r === 12;
    if (isPistol) {
      for (const s of slots) {
        credits.set(s.puuid, PISTOL_CREDITS);
        kept.set(s.puuid, null);
      }
      lossStreak.Red = 0;
      lossStreak.Blue = 0;
    }
    if (r >= 24) for (const s of slots) credits.set(s.puuid, OVERTIME_CREDITS);

    // ---------------------------------------------------------------- compra
    const purchases = new Map<string, Purchase>();
    for (const team of ['Blue', 'Red'] as const) {
      const members = teamOf(team);
      const avg = members.reduce((sum, s) => sum + (credits.get(s.puuid) ?? 0), 0) / members.length;
      const type = isPistol ? 'pistol' : buyTypeForCredits(avg);
      for (const s of members) {
        purchases.set(s.puuid, buyLoadout(credits.get(s.puuid) ?? 0, type, kept.get(s.puuid) ?? null, rng, s.sniper));
      }
    }

    // --------------------------------------------------------------- roteiro
    const attackerWon = winner === attackers;
    const outcome: Outcome = attackerWon
      ? rng.next() < 0.6 ? 'Detonate' : 'Elimination'
      : rng.next() < 0.3 ? 'Defuse' : 'Elimination';
    const planted = outcome !== 'Elimination' || (attackerWon && rng.next() < 0.45);
    const loserDeaths =
      outcome === 'Elimination' ? 5 : outcome === 'Detonate' ? rng.int(1, 4) : rng.int(2, 5);
    const winnerDeaths = rng.pick([0, 1, 1, 2, 2, 2, 3, 3, 4]);

    // 'L' = morre alguém do perdedor; 'W' = morre alguém do vencedor.
    const tokens = shuffle(rng, [
      ...Array<'L' | 'W'>(loserDeaths).fill('L'),
      ...Array<'L' | 'W'>(winnerDeaths).fill('W'),
    ]);
    if (loserDeaths === 5 && tokens[tokens.length - 1] !== 'L') {
      const last = tokens.lastIndexOf('L');
      tokens[last] = 'W';
      tokens[tokens.length - 1] = 'L';
    }
    const n = tokens.length;
    // Plant antes do último abate quando um time é eliminado (senão o round acabaria).
    const maxPlant = loserDeaths === 5 ? n - 1 : n;
    const plantAt = planted ? rng.int(Math.floor(maxPlant / 3), maxPlant) : -1;

    const plantTime = planted ? rng.int(25_000, 60_000) : 0;
    const times = planted
      ? [
          ...sortedTimes(rng, KILL_MIN_MILLIS, plantTime - 1000, plantAt),
          ...sortedTimes(rng, plantTime + 500, Math.min(KILL_MAX_MILLIS, plantTime + 38_000), n - plantAt),
        ]
      : sortedTimes(rng, KILL_MIN_MILLIS, KILL_MAX_MILLIS, n);

    // -------------------------------------------------------------- posições
    const site = rng.pick(sites);
    const siteZone = map.zones.find((z) => z.label === `${site} Site`) as MapZone;
    const zoneOf = new Map<string, MapZone>();
    for (const s of slots) {
      zoneOf.set(s.puuid, rng.pick(zonesFor(map, s.teamId === attackers ? 'attack' : 'defense', site)));
    }
    const locate = (s: Slot): RiotPlayerLocationsDto => ({
      puuid: s.puuid,
      viewRadians: Number((rng.next() * 2 * Math.PI).toFixed(4)),
      location: pointIn(rng, zoneOf.get(s.puuid) as MapZone),
    });

    // ---------------------------------------------------------------- abates
    const alive = new Set(slots.map((s) => s.puuid));
    const aliveOf = (team: TeamId): Slot[] => slots.filter((s) => s.teamId === team && alive.has(s.puuid));
    const killsBy = new Map<string, RiotKillDto[]>();
    const damageBy = new Map<string, RiotDamageDto[]>();
    const roundAssists = new Map<string, number>();
    const pushDamage = (from: string, dmg: RiotDamageDto): void => {
      damageBy.set(from, [...(damageBy.get(from) ?? []), dmg]);
    };
    let plantInfo: Partial<RiotRoundResultDto> = {};
    let planter: string | undefined;
    let lastKill = 0;

    const doPlant = (): void => {
      const who = rng.pick(aliveOf(attackers));
      planter = who.puuid;
      const plantLocation = pointIn(rng, siteZone);
      // Depois do plant, boa parte dos vivos converge para o site.
      for (const s of slots) if (rng.next() < 0.6) zoneOf.set(s.puuid, siteZone);
      plantInfo = {
        bombPlanter: who.puuid,
        plantRoundTime: plantTime,
        plantLocation,
        plantSite: site,
        plantPlayerLocations: slots.filter((s) => alive.has(s.puuid)).map(locate),
      };
    };

    tokens.forEach((token, step) => {
      if (step === plantAt) doPlant();
      const victimTeam = token === 'L' ? loser : winner;
      const victim = rng.pick(aliveOf(victimTeam));
      const killerTeam = otherTeam(victimTeam);
      const killer = weightedPick(rng, aliveOf(killerTeam), (s) => s.skill);
      const mates = shuffle(rng, aliveOf(killerTeam).filter((s) => s.puuid !== killer.puuid));
      const roll = rng.next();
      const assistants = mates.slice(0, roll < 0.45 ? 0 : roll < 0.85 ? 1 : 2).map((s) => s.puuid);
      const t = at(times, step);
      lastKill = t;
      const kill: RiotKillDto = {
        timeSinceGameStartMillis: offset + BUY_PHASE_MILLIS + t,
        timeSinceRoundStartMillis: t,
        killer: killer.puuid,
        victim: victim.puuid,
        victimLocation: pointIn(rng, zoneOf.get(victim.puuid) as MapZone),
        assistants,
        playerLocations: slots.filter((s) => alive.has(s.puuid) && s.puuid !== victim.puuid).map(locate),
        finishingDamage: {
          damageType: 'Weapon',
          damageItem: (purchases.get(killer.puuid) as Purchase).weapon,
          isSecondaryFireMode: rng.next() < 0.05,
        },
      };
      killsBy.set(killer.puuid, [...(killsBy.get(killer.puuid) ?? []), kill]);
      pushDamage(killer.puuid, {
        receiver: victim.puuid,
        damage: rng.int(100, 150),
        legshots: rng.int(0, 1),
        bodyshots: rng.int(1, 4),
        headshots: rng.int(0, 2),
      });
      for (const a of assistants) roundAssists.set(a, (roundAssists.get(a) ?? 0) + 1);
      alive.delete(victim.puuid);
    });
    if (planted && plantAt === n) doPlant();

    let defuseInfo: Partial<RiotRoundResultDto> = {};
    let defuser: string | undefined;
    let endTime = lastKill;
    if (outcome === 'Detonate') endTime = plantTime + SPIKE_MILLIS;
    if (outcome === 'Defuse') {
      const who = rng.pick(aliveOf(defenders));
      defuser = who.puuid;
      const defuseTime = Math.max(plantTime, lastKill) + rng.int(1000, 6500);
      zoneOf.set(who.puuid, siteZone);
      defuseInfo = {
        bombDefuser: who.puuid,
        defuseRoundTime: defuseTime,
        defuseLocation: plantInfo.plantLocation,
        defusePlayerLocations: slots.filter((s) => alive.has(s.puuid)).map(locate),
      };
      endTime = defuseTime;
    }

    // Dano não letal (chip) para dar textura ao scoreboard.
    for (const s of slots) {
      if (rng.next() < 0.45) {
        const target = rng.pick(teamOf(otherTeam(s.teamId)));
        pushDamage(s.puuid, { receiver: target.puuid, damage: rng.int(15, 85), legshots: 0, bodyshots: 1, headshots: rng.int(0, 1) });
      }
    }

    // --------------------------------------------------- stats e economia
    const playerStats: RiotPlayerRoundStatsDto[] = slots.map((s) => {
      const kills = killsBy.get(s.puuid) ?? [];
      const damage = damageBy.get(s.puuid) ?? [];
      const assists = roundAssists.get(s.puuid) ?? 0;
      const objective = s.puuid === planter || s.puuid === defuser ? 50 : 0;
      const score = damage.reduce((sum, d) => sum + d.damage, 0) + kills.length * 70 + assists * 25 + objective;
      const buy = purchases.get(s.puuid) as Purchase;
      const available = credits.get(s.puuid) ?? 0;
      const economy: RiotEconomyDto = {
        loadoutValue: buy.loadoutValue,
        weapon: buy.weapon,
        armor: buy.armor,
        remaining: available - buy.spent,
        spent: buy.spent,
      };
      const acc = totals.get(s.puuid) as RoundAcc;
      acc.kills += kills.length;
      acc.assists += assists;
      acc.score += score;
      if (!alive.has(s.puuid)) acc.deaths += 1;
      return { puuid: s.puuid, kills, damage, score, economy, ability: { ...NULL_ABILITY } };
    });

    lossStreak[loser] += 1;
    lossStreak[winner] = 0;
    for (const s of slots) {
      const buy = purchases.get(s.puuid) as Purchase;
      const base = s.teamId === winner ? WIN_REWARD : lossBonus(lossStreak[loser]);
      const reward =
        base +
        (killsBy.get(s.puuid)?.length ?? 0) * KILL_REWARD +
        (planted && s.teamId === attackers ? PLANT_REWARD : 0);
      credits.set(s.puuid, Math.min(CREDIT_CAP, (credits.get(s.puuid) ?? 0) - buy.spent + reward));
      kept.set(s.puuid, alive.has(s.puuid) ? { weapon: buy.weapon, armor: buy.armor } : null);
    }

    const winnerDead = tokens.filter((t) => t === 'W').length;
    const ace = [...killsBy.values()].some((k) => k.length === 5);
    const ceremony = ace
      ? 'CeremonyAce'
      : outcome === 'Elimination' && winnerDead === 0
        ? 'CeremonyFlawless'
        : 'CeremonyDefault';

    rounds.push({
      roundNum: r,
      roundResult: RESULT_LABEL[outcome],
      roundCeremony: ceremony,
      winningTeam: winner,
      winningTeamRole: attackerWon ? 'Attacker' : 'Defender',
      ...plantInfo,
      ...defuseInfo,
      playerStats,
      roundResultCode: outcome,
    });
    offset += BUY_PHASE_MILLIS + endTime + POST_ROUND_MILLIS;
  });

  const roundsPlayed = rounds.length;
  const players: RiotPlayerDto[] = slots.map((s) => {
    const acc = totals.get(s.puuid) as RoundAcc;
    const casts = createRng(seedOf('casts', id, s.puuid));
    return {
      puuid: s.puuid,
      gameName: s.gameName,
      tagLine: s.tagLine,
      teamId: s.teamId,
      partyId: s.partyId,
      characterId: s.agent.uuid,
      stats: {
        score: acc.score,
        roundsPlayed,
        kills: acc.kills,
        deaths: acc.deaths,
        assists: acc.assists,
        playtimeMillis: offset,
        abilityCasts: {
          grenadeCasts: Math.round(roundsPlayed * (0.4 + casts.next() * 0.5)),
          ability1Casts: Math.round(roundsPlayed * (0.5 + casts.next() * 0.6)),
          ability2Casts: Math.round(roundsPlayed * (0.3 + casts.next() * 0.5)),
          ultimateCasts: Math.max(0, Math.round(roundsPlayed / 9 + casts.next() * 1.5 - 0.5)),
        },
      },
      competitiveTier: s.tier,
      isObserver: false,
      playerCard: PLAYER_CARD,
      playerTitle: PLAYER_TITLE,
      accountLevel: s.accountLevel,
    };
  });

  const roundsWon = (team: TeamId): number => plan.roundWinners.filter((w) => w === team).length;
  const team = (teamId: TeamId) => ({
    teamId,
    won: plan.winner === teamId,
    roundsPlayed,
    roundsWon: roundsWon(teamId),
    numPoints: roundsWon(teamId),
  });

  return {
    matchInfo: {
      matchId: id,
      mapId: map.mapId,
      gameVersion: GAME_VERSION,
      gameLengthMillis: offset,
      region: REGION,
      gameStartMillis: gameStart,
      provisioningFlowId: 'Matchmaking',
      isCompleted: true,
      customGameName: '',
      queueId: MOCK_QUEUE_ID,
      gameMode: GAME_MODE,
      isRanked: true,
      seasonId: MOCK_SEASON_ID,
    },
    players,
    coaches: [],
    teams: [team('Blue'), team('Red')],
    roundResults: rounds,
  };
}
