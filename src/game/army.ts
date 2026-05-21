import type { ArmyState, PerkId } from '@/types';

export interface UnitDef {
  key: keyof ArmyState;
  label: string;
  emoji: string;
  cost: number;       // millions
  capitalDmg: number; // damage to capital HP per single-unit attack
  longRange: boolean; // air/sea/missile reach the globe
  groundOnly: boolean;
  defensive?: boolean;
  strategic?: boolean; // nukes — special rules
  category: 'land' | 'air' | 'sea' | 'strategic' | 'defense';
  description?: string;
}

export const UNITS: UnitDef[] = [
  // Land
  { key: 'infantry', label: 'Infantry Brigade',  emoji: '🪖', cost: 5,    capitalDmg: 0,    longRange: false, groundOnly: true,  category: 'land' },
  { key: 'tanks',    label: 'Tank Battalion',    emoji: '🛡️', cost: 25,   capitalDmg: 0,    longRange: false, groundOnly: true,  category: 'land' },
  // Air
  { key: 'fighters', label: 'Fighter Squadron',  emoji: '✈️', cost: 60,   capitalDmg: 1,    longRange: true,  groundOnly: false, category: 'air' },
  { key: 'rafales',  label: 'Rafale Heavy Wing', emoji: '🛫', cost: 110,  capitalDmg: 2,    longRange: true,  groundOnly: false, category: 'air', description: 'Multirole — higher damage, harder to intercept.' },
  { key: 'stealth',  label: 'Stealth Squadron',  emoji: '🦇', cost: 200,  capitalDmg: 3,    longRange: true,  groundOnly: false, category: 'air', description: 'F-35-class. Bypasses 50% of conventional air defense.' },
  { key: 'bombers',  label: 'Bomber Wing',       emoji: '🛩️', cost: 120,  capitalDmg: 3,    longRange: true,  groundOnly: false, category: 'air' },
  // Sea
  { key: 'ships',    label: 'Naval Fleet',       emoji: '🚢', cost: 90,   capitalDmg: 1,    longRange: true,  groundOnly: false, category: 'sea' },
  { key: 'subs',     label: 'Submarine',         emoji: '⚓', cost: 180,  capitalDmg: 2,    longRange: true,  groundOnly: false, category: 'sea', description: 'Stealth sea launch — ignores most air defenses.' },
  // Tactical
  { key: 'missiles', label: 'Ballistic Missile', emoji: '🚀', cost: 80,   capitalDmg: 10,   longRange: true,  groundOnly: false, category: 'strategic' },
  // Strategic
  { key: 'nukes',    label: 'Nuclear Warhead',   emoji: '☢️', cost: 0,    capitalDmg: 2000, longRange: true,  groundOnly: false, category: 'strategic', strategic: true, description: 'Devastating — not purchasable. Limited by real-world arsenal at game start.' },
  // Defense
  { key: 'airDefense',    label: 'Air Defense Battery', emoji: '🛰️', cost: 90,  capitalDmg: 0, longRange: false, groundOnly: false, category: 'defense', defensive: true, description: 'Intercepts ~25% of incoming aircraft per battery.' },
  { key: 'groundDefense', label: 'Fortifications',      emoji: '🧱', cost: 40,  capitalDmg: 0, longRange: false, groundOnly: false, category: 'defense', defensive: true, description: 'Hardens borders against ground invasion.' },
  { key: 'ironDomes',     label: 'Iron Dome Battery',   emoji: '🛡️', cost: 1500, capitalDmg: 0, longRange: false, groundOnly: false, category: 'defense', defensive: true, description: 'COSTLIEST. Once active, intercepts incoming missiles & nukes at the cost of one missile per attempt.' },
];

export const UNIT_BY_KEY: Record<keyof ArmyState, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.key, u])
) as Record<keyof ArmyState, UnitDef>;

export function emptyArmy(): ArmyState {
  return {
    infantry: 0, tanks: 0,
    fighters: 0, stealth: 0, rafales: 0, bombers: 0,
    ships: 0, subs: 0,
    missiles: 0, nukes: 0,
    airDefense: 0, groundDefense: 0, ironDomes: 0,
  };
}

export function armyTotal(a: ArmyState): number {
  return Object.values(a).reduce((acc, n) => acc + n, 0);
}

// Sum of "fighting" units (excludes pure defenses + nukes for the headline UI counter)
export function fightingTotal(a: ArmyState): number {
  return a.infantry + a.tanks + a.fighters + a.stealth + a.rafales + a.bombers + a.ships + a.subs + a.missiles;
}

export function startingArmy(perks: PerkId[]): ArmyState {
  const base = emptyArmy();
  base.infantry = 20;
  base.tanks = 4;
  base.fighters = 2;
  base.ships = 1;
  if (perks.includes('militaristic')) {
    base.infantry += 30;
    base.tanks += 6;
    base.fighters += 3;
    base.ships += 1;
    base.airDefense += 1;
  }
  return base;
}

export function unitCostFor(unit: UnitDef, perks: PerkId[]): number {
  if (unit.strategic) return 0; // nukes are not purchasable
  if (perks.includes('diplomat')) return Math.round(unit.cost * 0.8);
  return unit.cost;
}

export function startingMoney(perks: PerkId[]): number {
  let base = 2000;
  if (perks.includes('wealthy')) base = Math.round(base * 1.5);
  return base;
}

export function startingMorale(perks: PerkId[]): number {
  return perks.includes('highMorale') ? 85 : 60;
}

export function startingInnovation(perks: PerkId[]): number {
  return perks.includes('innovator') ? 60 : 30;
}
