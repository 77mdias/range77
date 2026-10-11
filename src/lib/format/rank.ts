/**
 * Formatação do tier/ranque para o chip compacto do scoreboard (Stitch:
 * "ASC 3", "IMM 1"). É SOMENTE apresentação de um valor real — a HenrikDev
 * entrega o tier por extenso (ex.: "Ascendant 3"). Tier desconhecido cai no
 * texto em maiúsculas, sem inventar abreviação.
 */

const TIER_ABBREVIATIONS: Readonly<Record<string, string>> = {
  iron: 'IRN',
  bronze: 'BRZ',
  silver: 'SLV',
  gold: 'GLD',
  platinum: 'PLT',
  diamond: 'DIA',
  ascendant: 'ASC',
  immortal: 'IMM',
  radiant: 'RAD',
  unranked: 'UNR',
};

/**
 * `formatRankChip('Ascendant 3')` → `'ASC 3'`; sem número (`'Radiant'`) →
 * `'RAD'`; tier vazio ou desconhecido → texto em maiúsculas.
 */
export function formatRankChip(tier: string): string {
  const trimmed = tier.trim();
  if (trimmed === '') {
    return trimmed;
  }

  const parts = trimmed.split(/\s+/);
  const word = parts[0] ?? '';
  const rest = parts.slice(1);
  const abbreviation = TIER_ABBREVIATIONS[word.toLowerCase()];
  if (abbreviation === undefined) {
    return trimmed.toUpperCase();
  }

  return rest.length === 0 ? abbreviation : `${abbreviation} ${rest.join(' ')}`;
}
