/**
 * Catálogo de conteúdo do VALORANT: ids crus da Riot (VAL-MATCH-V1) → nomes.
 * ======================================================================
 *
 * A API oficial devolve `mapId` (asset path, ex. `/Game/Maps/Duality/Duality`),
 * `characterId`/`damageItem` (UUIDs de conteúdo) e `competitiveTier` (inteiro).
 * As telas e as agregações conhecem NOMES em inglês, no mesmo formato que a
 * HenrikDev já entregava ("Bind", "KAY/O", "Ascendant 3") — assim os lookups
 * de assets (`src/lib/valorant-assets.ts`) continuam funcionando.
 *
 * Tabelas EXPLÍCITAS (nunca derivamos nome por convenção). UUIDs são
 * comparados em minúsculas: a API real às vezes os devolve em maiúsculas.
 * Id fora da tabela → `null` (o normalizador decide o fallback).
 */

/** `matchInfo.mapId` (codinome interno) → nome exibido. */
const MAP_NAMES: Readonly<Record<string, string>> = {
  '/game/maps/ascent/ascent': 'Ascent',
  '/game/maps/duality/duality': 'Bind',
  '/game/maps/triad/triad': 'Haven',
  '/game/maps/bonsai/bonsai': 'Split',
  '/game/maps/port/port': 'Icebox',
  '/game/maps/foxtrot/foxtrot': 'Breeze',
  '/game/maps/canyon/canyon': 'Fracture',
  '/game/maps/pitt/pitt': 'Pearl',
  '/game/maps/jam/jam': 'Lotus',
  '/game/maps/juliett/juliett': 'Sunset',
  '/game/maps/infinity/infinity': 'Abyss',
};

/** `players[].characterId` → nome do agente (ids de conteúdo, valorant-api). */
const AGENT_NAMES: Readonly<Record<string, string>> = {
  'add6443a-41bd-e414-f6ad-e58d267f4e95': 'Jett',
  'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc': 'Reyna',
  'f94c3b30-42be-e959-889c-5aa313dba261': 'Raze',
  'eb93336a-449b-9c1b-0a54-a891f7921d69': 'Phoenix',
  'bb2a4828-46eb-8cd1-e765-15848195d751': 'Neon',
  '7f94d92c-4234-0a36-9646-3a87eb8b5c89': 'Yoru',
  '0e38b510-41a8-5780-5e8f-568b2a4f2d6c': 'Iso',
  '320b2a48-4d9b-a075-30f1-1f93a9b638fa': 'Sova',
  '5f8d3a7f-467b-97f3-062c-13acf203c006': 'Breach',
  '6f2a04ca-43e0-be17-7f36-b3908627744d': 'Skye',
  '601dbbe7-43ce-be57-2a40-4abd24953621': 'KAY/O',
  'dade69b4-4f5a-8528-247b-219e5a1facd6': 'Fade',
  'e370fa57-4757-3604-3648-499e1f642d3f': 'Gekko',
  '8e253930-4c05-31dd-1b6c-968525494517': 'Omen',
  '9f0d8ba9-4140-b941-57d3-a7ad57c6b417': 'Brimstone',
  '707eab51-4836-f488-046a-cda6bf494859': 'Viper',
  '41fb69c1-4189-7b37-f117-bcaf1e96f1bf': 'Astra',
  '95b78ed7-4637-86d9-7e41-71ba8c293152': 'Harbor',
  '1dbf2edd-4729-0984-3115-daa5eed44993': 'Clove',
  '1e58de9c-4950-5125-93e9-a0aee9f98746': 'Killjoy',
  '117ed9e3-49f3-6512-3ccf-0cada7e3823b': 'Cypher',
  '569fdd95-4d10-43ab-ca70-79becc718b46': 'Sage',
  '22697a3d-45bf-8dd7-4fec-84a9e28c69d7': 'Chamber',
  'cc8b64c8-4b25-4ff9-6e7f-37b4da43d235': 'Deadlock',
  'efba5359-4016-a1e5-7626-b1ae76895940': 'Vyse',
};

/** `finishingDamage.damageItem` (quando `damageType` = Weapon) → arma. */
const WEAPON_NAMES: Readonly<Record<string, string>> = {
  '29a0cfab-485b-f5d5-779a-b59f85e204a8': 'Classic',
  '42da8ccc-40d5-affc-beec-15aa47b42eda': 'Shorty',
  '44d4e95c-4157-0037-81b2-17841bf2e8e3': 'Frenzy',
  '1baa85b4-4c70-1284-64bb-6481dfc3bb4e': 'Ghost',
  'e336c6b8-418d-9340-d77f-7a9e4cfe0702': 'Sheriff',
  'f7e1b454-4ad4-1063-ec0a-159e56b58941': 'Stinger',
  '462080d1-4035-2937-7c09-27aa2a5c27a7': 'Spectre',
  '910be174-449b-c412-ab22-d0873436b21b': 'Bucky',
  'ec845bf4-4f79-ddda-a3da-0db3774b2794': 'Judge',
  'ae3de142-4d85-2547-dd26-4e90bed35cf7': 'Bulldog',
  '4ade7faa-4cf1-8376-95ef-39884480959b': 'Guardian',
  'ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a': 'Phantom',
  '9c82e19d-4575-0200-1a81-3eacf00cf872': 'Vandal',
  'c4883e50-4494-202c-3ec3-6b8a9284f00b': 'Marshal',
  'a03b24d3-4319-996d-0f8c-94bbfba1dfc7': 'Operator',
  '55d8a0f4-4274-ca67-fe2c-06ab45efdf58': 'Ares',
  '63e6c2b6-4a8e-869c-3d4c-e38355226584': 'Odin',
  '2f59173c-4bed-b6c3-2191-dea9b58be9c7': 'Melee',
};

/**
 * `competitiveTier` (0–27) → nome no formato da HenrikDev. 1–2 são tiers
 * "Unused" do jogo e ficam sem nome (`null`).
 */
const TIER_NAMES: Readonly<Record<number, string>> = {
  0: 'Unrated',
  3: 'Iron 1',
  4: 'Iron 2',
  5: 'Iron 3',
  6: 'Bronze 1',
  7: 'Bronze 2',
  8: 'Bronze 3',
  9: 'Silver 1',
  10: 'Silver 2',
  11: 'Silver 3',
  12: 'Gold 1',
  13: 'Gold 2',
  14: 'Gold 3',
  15: 'Platinum 1',
  16: 'Platinum 2',
  17: 'Platinum 3',
  18: 'Diamond 1',
  19: 'Diamond 2',
  20: 'Diamond 3',
  21: 'Ascendant 1',
  22: 'Ascendant 2',
  23: 'Ascendant 3',
  24: 'Immortal 1',
  25: 'Immortal 2',
  26: 'Immortal 3',
  27: 'Radiant',
};

/**
 * `matchInfo.seasonId` → rótulo curto do ato (o `season.short` da HenrikDev).
 * Só entram ids conhecidos; o ato do mock (`MOCK_SEASON_ID`) tem rótulo
 * próprio, explícito, para não fingir ser um ato real.
 */
const SEASON_LABELS: Readonly<Record<string, string>> = {
  '4c4b8cff-43eb-13d3-8f14-96b783c90cd2': 'Ato simulado',
};

function lookupLower(table: Readonly<Record<string, string>>, id: string): string | null {
  return table[id.trim().toLowerCase()] ?? null;
}

export function mapNameById(mapId: string): string | null {
  return lookupLower(MAP_NAMES, mapId);
}

export function agentNameById(characterId: string): string | null {
  return lookupLower(AGENT_NAMES, characterId);
}

export function weaponNameById(damageItem: string): string | null {
  return lookupLower(WEAPON_NAMES, damageItem);
}

export function tierNameById(competitiveTier: number): string | null {
  return TIER_NAMES[competitiveTier] ?? null;
}

export function seasonLabelById(seasonId: string): string | null {
  return lookupLower(SEASON_LABELS, seasonId);
}
