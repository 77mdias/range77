/**
 * Mapa de assets estáticos do Valorant (commitados em `public/assets`).
 *
 * Os arquivos têm nomes/extensões heterogêneos (jpeg/webp/png) — o lookup é
 * uma tabela EXPLÍCITA (nunca montamos caminho por convenção, que quebraria
 * em runtime). Nomes de agente/mapa chegam da HenrikDev em inglês
 * ("KAY/O", "Waylay", "Ascent"); a normalização cobre as variações conhecidas.
 * Nome fora da tabela → `null` (o componente cai no fallback de iniciais).
 */

const AGENT_ICONS: Readonly<Record<string, string>> = {
  astra: '/assets/images/agents/astra.png',
  aylay: '/assets/images/agents/aylay.png', // Waylay (arquivo com nome curto)
  breach: '/assets/images/agents/breach.png',
  brimstone: '/assets/images/agents/brimstone.png',
  chamber: '/assets/images/agents/chamber.png',
  clove: '/assets/images/agents/clove.png',
  cypher: '/assets/images/agents/cypher.png',
  deadlock: '/assets/images/agents/deadlock.png',
  fade: '/assets/images/agents/fade.png',
  gekko: '/assets/images/agents/gekko.png',
  harbor: '/assets/images/agents/harbor.png',
  iso: '/assets/images/agents/iso.png',
  jett: '/assets/images/agents/jett.png',
  'kay/o': '/assets/images/agents/kay-o.png',
  'kay-o': '/assets/images/agents/kay-o.png',
  killjoy: '/assets/images/agents/killjoy.png',
  miks: '/assets/images/agents/miks.jpeg',
  neon: '/assets/images/agents/neon.png',
  omen: '/assets/images/agents/omen.png',
  phoenix: '/assets/images/agents/phoenix.png',
  raze: '/assets/images/agents/raze.png',
  reyna: '/assets/images/agents/reyna.png',
  sage: '/assets/images/agents/sage.png',
  skye: '/assets/images/agents/skye.png',
  sova: '/assets/images/agents/sova.png',
  tejo: '/assets/images/agents/tejo.png',
  veto: '/assets/images/agents/veto.jpeg',
  viper: '/assets/images/agents/viper.png',
  vyse: '/assets/images/agents/vyse.png',
  waylay: '/assets/images/agents/aylay.png',
  yoru: '/assets/images/agents/yoru.png',
};

const AGENT_ART: Readonly<Record<string, string>> = {
  astra: '/assets/images/agents-design/astra-design.png',
  breach: '/assets/images/agents-design/breach-design.png',
  brimstone: '/assets/images/agents-design/brimstone-design.png',
  chamber: '/assets/images/agents-design/chamber-design.png',
  clove: '/assets/images/agents-design/clove-design.png',
  cypher: '/assets/images/agents-design/cypher-design.png',
  deadlock: '/assets/images/agents-design/deadlock-design.png',
  fade: '/assets/images/agents-design/fade-design.jpeg',
  gekko: '/assets/images/agents-design/gekko-design.webp',
  harbor: '/assets/images/agents-design/harbor-design.jpeg',
  iso: '/assets/images/agents-design/iso-design.webp',
  jett: '/assets/images/agents-design/jett-design.webp',
  'kay/o': '/assets/images/agents-design/kayo-design.webp',
  'kay-o': '/assets/images/agents-design/kayo-design.webp',
  killjoy: '/assets/images/agents-design/killjoy-design.png',
  miks: '/assets/images/agents-design/miks-design.jpeg',
  neon: '/assets/images/agents-design/neon-design.png',
  omen: '/assets/images/agents-design/omen-design.png',
  phoenix: '/assets/images/agents-design/phoenix-design.png',
  raze: '/assets/images/agents-design/raze-design.png',
  reyna: '/assets/images/agents-design/reyna-design.webp',
  sage: '/assets/images/agents-design/sage-design.webp',
  skye: '/assets/images/agents-design/skye-design.jpeg',
  sova: '/assets/images/agents-design/sova-design.webp',
  tejo: '/assets/images/agents-design/tejo-design.jpeg',
  veto: '/assets/images/agents-design/veto-design.webp',
  viper: '/assets/images/agents-design/viper-design.png',
  vyse: '/assets/images/agents-design/vyse-design.webp',
  waylay: '/assets/images/agents-design/waylay-design.webp',
  yoru: '/assets/images/agents-design/yoru-design.png',
};

const MAP_SPLASH: Readonly<Record<string, string>> = {
  abyss: '/assets/images/maps/abyss.webp',
  ascent: '/assets/images/maps/ascent.jpeg',
  bind: '/assets/images/maps/bind.webp',
  breeze: '/assets/images/maps/breeze.jpeg',
  corrode: '/assets/images/maps/corrode.webp',
  fracture: '/assets/images/maps/fracture.webp',
  haven: '/assets/images/maps/haven.jpeg',
  icebox: '/assets/images/maps/icebox.webp',
  lotus: '/assets/images/maps/lotus.jpeg',
  pearl: '/assets/images/maps/pearl.webp',
  split: '/assets/images/maps/split.webp',
  summit: '/assets/images/maps/summit.webp',
  sunset: '/assets/images/maps/sunset.webp',
};

const MAP_MINIMAP: Readonly<Record<string, string>> = {
  abyss: '/assets/images/maps/abyss-map.webp',
  ascent: '/assets/images/maps/ascent-map.png',
  bind: '/assets/images/maps/bind-map.webp',
  breeze: '/assets/images/maps/breeze-map.webp',
  corrode: '/assets/images/maps/corrode-map.webp',
  fracture: '/assets/images/maps/fracture-map.webp',
  haven: '/assets/images/maps/haven-map.webp',
  icebox: '/assets/images/maps/icebox-map.png',
  lotus: '/assets/images/maps/lotus-map.png',
  pearl: '/assets/images/maps/pearl-map.webp',
  split: '/assets/images/maps/split-map.webp',
  summit: '/assets/images/maps/summit-map.webp',
  sunset: '/assets/images/maps/sunset-map.webp',
};

/**
 * Normaliza o nome vindo da HenrikDev para a chave da tabela:
 * minúsculas, sem acentos e com separadores não-alfanuméricos viram hífen
 * ("KAY/O" → "kay-o"). Desconhecidos voltam como a própria chave minúscula.
 * Exportado para reuso em outras tabelas estáticas de agente (papéis).
 */
export function normalizeValorantName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-z0-9]+/g, '-');
}

function lookup(table: Readonly<Record<string, string>>, name: string): string | null {
  const key = normalizeValorantName(name);
  return table[key] ?? null;
}

/** Ícone do agente (`/assets/images/agents`); `null` se sem asset. */
export function agentIconSrc(agent: string): string | null {
  return lookup(AGENT_ICONS, agent);
}

/** Arte/retrato do agente (`/assets/images/agents-design`); `null` se sem asset. */
export function agentArtSrc(agent: string): string | null {
  return lookup(AGENT_ART, agent);
}

/** Splash do mapa (`/assets/images/maps`); `null` se sem asset. */
export function mapSplashSrc(map: string): string | null {
  return lookup(MAP_SPLASH, map);
}

/** Minimapa do mapa (`/assets/images/maps/{map}-map`); `null` se sem asset. */
export function mapMinimapSrc(map: string): string | null {
  return lookup(MAP_MINIMAP, map);
}
