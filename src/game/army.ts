import type { ArmyState, PerkId } from '@/types';

// Cost (in money points, where money is in millions) + production time placeholder.
// Future iterations: scale per innovation level, perk discounts, supply chain.
export interface UnitDef {
  key: keyof ArmyState;
  label: string;
  emoji: string;
  cost: number;
  // 1-point damage to a capital per attack action; multi-strike supported by spending more money.
  capitalDmg: number;
  // Whether this unit can attack a capital with no shared land border (air/sea reach).
  longRange: boolean;
  // Whether ground attack requires shared land border via an owned territory or camp.
  groundOnly: boolean;
}

export const UNITS: UnitDef[] = [
  { key: 'infantry', label: 'Infantry Brigade', emoji: '🪖', cost: 5,  capitalDmg: 0,  longRange: false, groundOnly: true  },
  { key: 'tanks',    label: 'Tank Battalion',   emoji: '🛡️', cost: 25, capitalDmg: 0,  longRange: false, groundOnly: true  },
  { key: 'fighters', label: 'Fighter Squadron', emoji: '✈️', cost: 60, capitalDmg: 1,  longRange: true,  groundOnly: false },
  { key: 'bombers',  label: 'Bomber Wing',      emoji: '🛩️', cost: 120,capitalDmg: 3,  longRange: true,  groundOnly: false },
  { key: 'ships',    label: 'Naval Fleet',      emoji: '🚢', cost: 90, capitalDmg: 1,  longRange: true,  groundOnly: false },
  { key: 'missiles', label: 'Ballistic Missile',emoji: '🚀', cost: 80, capitalDmg: 10, longRange: true,  groundOnly: false },
];

export function emptyArmy(): ArmyState {
  return { infantry: 0, tanks: 0, fighters: 0, bombers: 0, ships: 0, missiles: 0 };
}

export function armyTotal(a: ArmyState): number {
  return a.infantry + a.tanks + a.fighters + a.bombers + a.ships + a.missiles;
}

export function startingArmy(perks: PerkId[]): ArmyState {
  const base: ArmyState = { infantry: 20, tanks: 4, fighters: 2, bombers: 0, ships: 1, missiles: 0 };
  if (perks.includes('militaristic')) {
    base.infantry += 30;
    base.tanks += 6;
    base.fighters += 3;
    base.ships += 1;
  }
  return base;
}

export function unitCostFor(unit: UnitDef, perks: PerkId[]): number {
  if (perks.includes('diplomat')) return Math.round(unit.cost * 0.8);
  return unit.cost;
}

export function startingMoney(perks: PerkId[]): number {
  let base = 1000;
  if (perks.includes('wealthy')) base = Math.round(base * 1.5);
  return base;
}

export function startingMorale(perks: PerkId[]): number {
  return perks.includes('highMorale') ? 85 : 60;
}

export function startingInnovation(perks: PerkId[]): number {
  return perks.includes('innovator') ? 60 : 30;
}
