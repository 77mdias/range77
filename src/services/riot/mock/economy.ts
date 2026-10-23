import type { Rng } from './rng';

/**
 * Regras de economia do mock (créditos do VALORANT competitivo). Os ids
 * de arma/armadura são ids de conteúdo do jogo (valorant-api.com); o
 * `EconomyDto` oficial usa esses ids como `weapon`/`armor` (sem armadura = '').
 */

export type BuyType = 'pistol' | 'eco' | 'force' | 'full';

export const CREDIT_CAP = 9000;
export const PISTOL_CREDITS = 800;
export const OVERTIME_CREDITS = 5000;
export const WIN_REWARD = 3000;
export const KILL_REWARD = 200;
export const PLANT_REWARD = 300;

interface Item {
  readonly id: string;
  readonly cost: number;
}

export const WEAPONS = {
  classic: { id: '29a0cfab-485b-f5d5-779a-b59f85e204a8', cost: 0 },
  shorty: { id: '42da8ccc-40d5-affc-beec-15aa47b42eda', cost: 300 },
  frenzy: { id: '44d4e95c-4157-0037-81b2-17841bf2e8e3', cost: 450 },
  ghost: { id: '1baa85b4-4c70-1284-64bb-6481dfc3bb4e', cost: 500 },
  sheriff: { id: 'e336c6b8-418d-9340-d77f-7a9e4cfe0702', cost: 800 },
  marshal: { id: 'c4883e50-4494-202c-3ec3-6b8a9284f00b', cost: 950 },
  stinger: { id: 'f7e1b454-4ad4-1063-ec0a-159e56b58941', cost: 1100 },
  spectre: { id: '462080d1-4035-2937-7c09-27aa2a5c27a7', cost: 1600 },
  judge: { id: 'ec845bf4-4f79-ddda-a3da-0db3774b2794', cost: 1850 },
  bulldog: { id: 'ae3de142-4d85-2547-dd26-4e90bed35cf7', cost: 2050 },
  vandal: { id: '9c82e19d-4575-0200-1a81-3eacf00cf872', cost: 2900 },
  phantom: { id: 'ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a', cost: 2900 },
  operator: { id: 'a03b24d3-4319-996d-0f8c-94bbfba1dfc7', cost: 4700 },
} as const satisfies Record<string, Item>;

export const ARMORS = {
  none: { id: '', cost: 0 },
  light: { id: '4dec83d5-4902-9ab3-bed6-a7a390761157', cost: 400 },
  heavy: { id: '822bcab2-40a2-324e-c137-e09195ad7692', cost: 1000 },
} as const satisfies Record<string, Item>;

const costById = new Map<string, number>(
  [...Object.values(WEAPONS), ...Object.values(ARMORS)].map((i) => [i.id, i.cost]),
);

/** Preço de uma arma/armadura pelo id (desconhecido = 0). */
export function itemCost(id: string): number {
  return costById.get(id) ?? 0;
}

/** Tipo de compra do time pelos créditos médios. */
export function buyTypeForCredits(averageCredits: number): Exclude<BuyType, 'pistol'> {
  if (averageCredits <= 2000) return 'eco';
  if (averageCredits <= 3900) return 'force';
  return 'full';
}

/** Bônus de derrota pela sequência de derrotas (1ª, 2ª, 3ª+). */
export function lossBonus(streak: number): number {
  if (streak <= 1) return 1900;
  if (streak === 2) return 2400;
  return 2900;
}

export interface KeptLoadout {
  readonly weapon: string;
  readonly armor: string;
}

export interface Purchase {
  readonly weapon: string;
  readonly armor: string;
  /** Valor do equipamento em mãos (arma + armadura). */
  readonly loadoutValue: number;
  /** Créditos gastos neste round (compras + utilitários). */
  readonly spent: number;
}

const PISTOL_OPTIONS: readonly (readonly [Item, Item])[] = [
  [WEAPONS.classic, ARMORS.light],
  [WEAPONS.ghost, ARMORS.none],
  [WEAPONS.sheriff, ARMORS.none],
  [WEAPONS.frenzy, ARMORS.none],
  [WEAPONS.shorty, ARMORS.light],
  [WEAPONS.classic, ARMORS.none],
];

const FORCE_WEAPONS: readonly Item[] = [
  WEAPONS.bulldog,
  WEAPONS.spectre,
  WEAPONS.judge,
  WEAPONS.stinger,
  WEAPONS.marshal,
  WEAPONS.sheriff,
];

/**
 * Compra de um jogador. Garante `spent <= credits` e, no pistol,
 * `loadoutValue <= 800`. `kept` é o equipamento de quem sobreviveu ao round
 * anterior (não é pago de novo).
 */
export function buyLoadout(
  credits: number,
  type: BuyType,
  kept: KeptLoadout | null,
  rng: Rng,
  prefersSniper: boolean,
): Purchase {
  let budget = type === 'pistol' ? Math.min(credits, PISTOL_CREDITS) : credits;
  let spent = 0;
  const pay = (cost: number): void => {
    budget -= cost;
    spent += cost;
  };

  let weapon: Item = WEAPONS.classic;
  let armor: Item = ARMORS.none;

  if (type === 'pistol') {
    const [w, a] = rng.pick(PISTOL_OPTIONS.filter(([w2, a2]) => w2.cost + a2.cost <= budget));
    weapon = w;
    armor = a;
    pay(w.cost + a.cost);
  } else {
    weapon = { id: kept?.weapon ?? WEAPONS.classic.id, cost: itemCost(kept?.weapon ?? '') };
    armor = { id: kept?.armor ?? '', cost: itemCost(kept?.armor ?? '') };

    if (type === 'eco') {
      if (weapon.cost === 0) {
        if (budget >= 1300 && rng.next() < 0.35) weapon = WEAPONS.sheriff;
        else if (budget >= 500 && rng.next() < 0.35) weapon = WEAPONS.ghost;
        pay(weapon.cost);
      }
      if (armor.cost === 0 && budget >= 400 && rng.next() < 0.4) {
        armor = ARMORS.light;
        pay(armor.cost);
      }
    } else {
      const wantsRifle = type === 'full';
      if (weapon.cost < (wantsRifle ? 2900 : 1600)) {
        let choice: Item | undefined;
        if (wantsRifle && prefersSniper && budget >= WEAPONS.operator.cost + ARMORS.heavy.cost) {
          choice = WEAPONS.operator;
        } else if (wantsRifle && budget >= 2900) {
          choice = rng.pick([WEAPONS.vandal, WEAPONS.phantom]);
        } else {
          const withArmor = FORCE_WEAPONS.filter((w) => w.cost <= budget - ARMORS.light.cost);
          const any = FORCE_WEAPONS.filter((w) => w.cost <= budget);
          const pool = withArmor.length > 0 ? withArmor : any;
          if (pool.length > 0) choice = rng.pick(pool.slice(0, 3));
        }
        if (choice && choice.cost > weapon.cost) {
          weapon = choice;
          pay(choice.cost);
        }
      }
      if (armor.cost < ARMORS.heavy.cost) {
        if (wantsRifle && budget >= ARMORS.heavy.cost) {
          armor = ARMORS.heavy;
          pay(armor.cost);
        } else if (armor.cost === 0 && budget >= ARMORS.light.cost) {
          armor = ARMORS.light;
          pay(armor.cost);
        }
      }
    }
  }

  const utilCap = type === 'full' ? 600 : type === 'force' ? 400 : 200;
  const util = Math.floor(rng.int(0, Math.max(0, Math.min(budget, utilCap))) / 50) * 50;
  pay(util);

  return { weapon: weapon.id, armor: armor.id, loadoutValue: weapon.cost + armor.cost, spent };
}
