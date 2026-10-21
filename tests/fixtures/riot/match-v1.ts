import type {
  RiotDamageDto,
  RiotEconomyDto,
  RiotKillDto,
  RiotMatchDto,
  RiotPlayerDto,
  RiotPlayerLocationsDto,
  RiotPlayerRoundStatsDto,
  RiotRoundResultDto,
} from '@/contracts/riot';

/**
 * FIXTURE — uma partida competitiva COMPLETA no formato oficial
 * VAL-MATCH-V1 (`GET /val/match/v1/matches/{matchId}`), Ascent, 13–5.
 *
 * Todos os nomes, PUUIDs, matchId e seasonId são FICTÍCIOS (nenhum Riot ID
 * real). Ids de conteúdo (mapa, agentes, armas, armaduras) seguem o formato
 * de UUID de conteúdo do jogo e são ilustrativos.
 *
 * Os rounds são montados por um roteiro declarativo (`SCRIPT`) e expandidos
 * de forma determinística — mesma fixture byte a byte em toda execução.
 */

type TeamId = 'Red' | 'Blue';

const MATCH_ID = 'f1c7a0e2-5b3d-4c8e-9a10-00000000a001';
const SEASON_ID = '0f3e5a1c-7d2b-4e9f-8c6a-00000000e011';

const ARMOR_LIGHT = '4dec83d5-4902-9ab3-bed6-a7a390761157';
const ARMOR_HEAVY = '822bcab2-40a2-324e-c137-e09195ad7692';
const WEAPON_CLASSIC = '29a0cfab-485b-f5d5-779a-b59f85e204a8';
const WEAPON_VANDAL = '9c82e19d-4575-0200-1a81-3eacf00cf872';
const WEAPON_PHANTOM = 'ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a';

/** PUUID fictício com o comprimento oficial (78 caracteres). */
function puuid(i: number): string {
  return `vc-fixture-puuid-${String(i).padStart(2, '0')}-`.padEnd(78, 'x');
}

interface Roster {
  readonly gameName: string;
  readonly tagLine: string;
  readonly teamId: TeamId;
  readonly characterId: string;
  readonly competitiveTier: number;
}

/** 0–4 Blue, 5–9 Red. Agentes: Jett, Sova, Omen, Killjoy, Sage / Reyna, Breach, Brimstone, Cypher, Skye. */
const ROSTER: readonly Roster[] = [
  { gameName: 'Lumen', tagLine: 'VC01', teamId: 'Blue', characterId: 'add6443a-41bd-e414-f6ad-e58d267f4e95', competitiveTier: 15 },
  { gameName: 'Corvo Azul', tagLine: 'VC02', teamId: 'Blue', characterId: '320b2a48-4d9b-a075-30f1-1f93a9b638fa', competitiveTier: 14 },
  { gameName: 'Neblina', tagLine: 'VC03', teamId: 'Blue', characterId: '8e253930-4c05-31dd-1b6c-968525494517', competitiveTier: 15 },
  { gameName: 'Torre Fria', tagLine: 'VC04', teamId: 'Blue', characterId: '1e58de9c-4950-5125-93e9-a0aee9f98746', competitiveTier: 13 },
  { gameName: 'Seiva', tagLine: 'VC05', teamId: 'Blue', characterId: '569fdd95-4d10-43ab-ca70-79becc718b46', competitiveTier: 14 },
  { gameName: 'Rubra', tagLine: 'VC06', teamId: 'Red', characterId: 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc', competitiveTier: 15 },
  { gameName: 'Tremor', tagLine: 'VC07', teamId: 'Red', characterId: '5f8d3a7f-467b-97f3-062c-13acf203c006', competitiveTier: 14 },
  { gameName: 'Fumaça Velha', tagLine: 'VC08', teamId: 'Red', characterId: '9f0d8ba9-4140-b941-57d3-a7ad57c6b417', competitiveTier: 16 },
  { gameName: 'Olho Mudo', tagLine: 'VC09', teamId: 'Red', characterId: '117ed9e3-49f3-6512-3ccf-0cada7e3823b', competitiveTier: 13 },
  { gameName: 'Trilha', tagLine: 'VC10', teamId: 'Red', characterId: '6f2a04ca-43e0-be17-7f36-b3908627744d', competitiveTier: 15 },
];

type Outcome = 'Elimination' | 'Detonate' | 'Defuse';

interface RoundScript {
  readonly winner: TeamId;
  readonly outcome: Outcome;
  /** Site plantado (obrigatório em Detonate/Defuse, opcional em Elimination). */
  readonly site?: 'A' | 'B';
}

/** Red ataca nos rounds 0–11; Blue ataca a partir do 12. Final: Blue 13 × 5 Red. */
const SCRIPT: readonly RoundScript[] = [
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Red', outcome: 'Detonate', site: 'A' },
  { winner: 'Blue', outcome: 'Defuse', site: 'B' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Red', outcome: 'Elimination', site: 'A' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Blue', outcome: 'Defuse', site: 'A' },
  { winner: 'Red', outcome: 'Detonate', site: 'B' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Red', outcome: 'Detonate', site: 'A' },
  { winner: 'Blue', outcome: 'Detonate', site: 'B' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Red', outcome: 'Defuse', site: 'A' },
  { winner: 'Blue', outcome: 'Detonate', site: 'A' },
  { winner: 'Blue', outcome: 'Elimination' },
  { winner: 'Blue', outcome: 'Elimination' },
];

const ROUND_LENGTH_MILLIS = 100_000;
const PLANT_TIME_MILLIS = 30_000;
const SITE_POINT = { A: { x: 6200, y: -6400 }, B: { x: -3100, y: -7900 } } as const;

const attackersOf = (roundNum: number): TeamId => (roundNum < 12 ? 'Red' : 'Blue');
const other = (team: TeamId): TeamId => (team === 'Red' ? 'Blue' : 'Red');
const indicesOf = (team: TeamId): number[] =>
  ROSTER.flatMap((p, i) => (p.teamId === team ? [i] : []));

function location(player: number, roundNum: number, step: number): RiotPlayerLocationsDto {
  return {
    puuid: puuid(player),
    viewRadians: Number((((player * 1.3 + step * 0.7 + roundNum * 0.11) % (2 * Math.PI))).toFixed(4)),
    location: {
      x: -7000 + ((player * 1187 + roundNum * 389 + step * 211) % 14000),
      y: -10000 + ((player * 733 + roundNum * 571 + step * 157) % 9000),
    },
  };
}

function economy(player: number, roundNum: number): RiotEconomyDto {
  if (roundNum === 0 || roundNum === 12) {
    return { loadoutValue: 400, weapon: WEAPON_CLASSIC, armor: ARMOR_LIGHT, remaining: 400, spent: 400 };
  }
  const weapon = player % 2 === 0 ? WEAPON_VANDAL : WEAPON_PHANTOM;
  return { loadoutValue: 3900, weapon, armor: ARMOR_HEAVY, remaining: 1200 + (roundNum % 4) * 300, spent: 3900 };
}

/** Quantos abates cada lado faz no round, conforme o desfecho. */
function killBudget(outcome: Outcome): { winner: number; loser: number } {
  if (outcome === 'Elimination') return { winner: 5, loser: 2 };
  if (outcome === 'Detonate') return { winner: 3, loser: 2 };
  return { winner: 4, loser: 2 };
}

function buildRound(script: RoundScript, roundNum: number): RiotRoundResultDto {
  const attackers = attackersOf(roundNum);
  const loser = other(script.winner);
  const budget = killBudget(script.outcome);
  const alive = new Set<number>(ROSTER.map((_, i) => i));
  const killsBy = new Map<number, RiotKillDto[]>();
  const damageBy = new Map<number, RiotDamageDto[]>();

  // Ordem dos abates: começa pelo perdedor, depois alterna até esgotar os orçamentos.
  const order: TeamId[] = [];
  let w = budget.winner;
  let l = budget.loser;
  while (w > 0 || l > 0) {
    if (l > 0) { order.push(loser); l -= 1; }
    if (w > 0) { order.push(script.winner); w -= 1; }
  }

  const pick = (team: TeamId, offset: number): number | undefined => {
    const members = indicesOf(team).filter((i) => alive.has(i));
    return members.length === 0 ? undefined : members[(roundNum + offset) % members.length];
  };

  let plant: Pick<RiotRoundResultDto, 'bombPlanter' | 'plantRoundTime' | 'plantSite' | 'plantLocation' | 'plantPlayerLocations'> = {};
  let lastTime = 0;

  order.forEach((team, step) => {
    if (step === 2 && script.site) {
      const planter = pick(attackers, 0);
      if (planter !== undefined) {
        plant = {
          bombPlanter: puuid(planter),
          plantRoundTime: PLANT_TIME_MILLIS,
          plantSite: script.site,
          plantLocation: SITE_POINT[script.site],
          plantPlayerLocations: [...alive].map((p) => location(p, roundNum, step)),
        };
      }
    }
    const killer = pick(team, step);
    const victim = pick(other(team), step + 2);
    if (killer === undefined || victim === undefined) return;

    const sinceRound = 15_000 + step * 7_000 + (step >= 2 && script.site ? 8_000 : 0);
    lastTime = sinceRound;
    const assistant = step % 2 === 0 ? pick(team, step + 1) : undefined;
    const kill: RiotKillDto = {
      timeSinceGameStartMillis: roundNum * ROUND_LENGTH_MILLIS + sinceRound,
      timeSinceRoundStartMillis: sinceRound,
      killer: puuid(killer),
      victim: puuid(victim),
      victimLocation: location(victim, roundNum, step).location,
      assistants: assistant !== undefined && assistant !== killer ? [puuid(assistant)] : [],
      playerLocations: [...alive].filter((p) => p !== victim).map((p) => location(p, roundNum, step)),
      finishingDamage: { damageType: 'Weapon', damageItem: economy(killer, roundNum).weapon, isSecondaryFireMode: false },
    };
    killsBy.set(killer, [...(killsBy.get(killer) ?? []), kill]);
    damageBy.set(killer, [
      ...(damageBy.get(killer) ?? []),
      { receiver: puuid(victim), damage: 150, legshots: 0, bodyshots: 1, headshots: 1 },
    ]);
    alive.delete(victim);
  });

  let defuse: Pick<RiotRoundResultDto, 'bombDefuser' | 'defuseRoundTime' | 'defuseLocation' | 'defusePlayerLocations'> = {};
  if (script.outcome === 'Defuse' && script.site) {
    const defuser = pick(other(attackers), 0);
    if (defuser !== undefined) {
      defuse = {
        bombDefuser: puuid(defuser),
        defuseRoundTime: lastTime + 8_000,
        defuseLocation: SITE_POINT[script.site],
        defusePlayerLocations: [...alive].map((p) => location(p, roundNum, 99)),
      };
    }
  }

  const playerStats: RiotPlayerRoundStatsDto[] = ROSTER.map((_, i) => {
    const kills = killsBy.get(i) ?? [];
    return {
      puuid: puuid(i),
      kills,
      damage: damageBy.get(i) ?? [],
      score: 50 + kills.length * 200,
      economy: economy(i, roundNum),
      ability: { grenadeEffects: null, ability1Effects: null, ability2Effects: null, ultimateEffects: null },
    };
  });

  const resultLabel: Record<Outcome, string> = {
    Elimination: 'Eliminated',
    Detonate: 'Bomb detonated',
    Defuse: 'Bomb defused',
  };

  return {
    roundNum,
    roundResult: resultLabel[script.outcome],
    roundCeremony: 'CeremonyDefault',
    winningTeam: script.winner,
    winningTeamRole: script.winner === attackers ? 'Attacker' : 'Defender',
    ...plant,
    ...defuse,
    playerStats,
    roundResultCode: script.outcome,
  };
}

const ROUNDS: readonly RiotRoundResultDto[] = SCRIPT.map(buildRound);

function buildPlayer(roster: Roster, i: number): RiotPlayerDto {
  const id = puuid(i);
  const allKills = ROUNDS.flatMap((r) => r.playerStats.flatMap((s) => s.kills));
  const kills = allKills.filter((k) => k.killer === id).length;
  const deaths = allKills.filter((k) => k.victim === id).length;
  const assists = allKills.filter((k) => k.assistants.includes(id)).length;
  const score = ROUNDS.reduce(
    (sum, r) => sum + (r.playerStats.find((s) => s.puuid === id)?.score ?? 0),
    0,
  );
  return {
    puuid: id,
    gameName: roster.gameName,
    tagLine: roster.tagLine,
    teamId: roster.teamId,
    partyId: `vc-fixture-party-${roster.teamId.toLowerCase()}-${i % 3}`,
    characterId: roster.characterId,
    stats: {
      score,
      roundsPlayed: ROUNDS.length,
      kills,
      deaths,
      assists,
      playtimeMillis: ROUNDS.length * ROUND_LENGTH_MILLIS,
      abilityCasts: { grenadeCasts: 9 + i, ability1Casts: 12 + (i % 4), ability2Casts: 7 + (i % 5), ultimateCasts: 1 + (i % 3) },
    },
    competitiveTier: roster.competitiveTier,
    isObserver: false,
    playerCard: '9fb348bc-41a0-91ad-8a3e-818035c4e561',
    playerTitle: 'd13e579c-435e-44d4-cec2-6eae5a3c5ed4',
    accountLevel: 40 + i * 7,
  };
}

const blueWins = SCRIPT.filter((r) => r.winner === 'Blue').length;
const redWins = SCRIPT.length - blueWins;

export const riotMatchFixture: RiotMatchDto = {
  matchInfo: {
    matchId: MATCH_ID,
    mapId: '/Game/Maps/Ascent/Ascent',
    gameVersion: 'release-11.08-shipping-14-000000',
    gameLengthMillis: ROUNDS.length * ROUND_LENGTH_MILLIS,
    region: 'br',
    gameStartMillis: 1_792_000_000_000,
    provisioningFlowId: 'Matchmaking',
    isCompleted: true,
    customGameName: '',
    queueId: 'competitive',
    gameMode: '/Game/GameModes/Bomb/BombGameMode.BombGameMode_C',
    isRanked: true,
    seasonId: SEASON_ID,
  },
  players: ROSTER.map(buildPlayer),
  coaches: [],
  teams: [
    { teamId: 'Blue', won: blueWins > redWins, roundsPlayed: ROUNDS.length, roundsWon: blueWins, numPoints: blueWins },
    { teamId: 'Red', won: redWins > blueWins, roundsPlayed: ROUNDS.length, roundsWon: redWins, numPoints: redWins },
  ],
  roundResults: ROUNDS,
};
