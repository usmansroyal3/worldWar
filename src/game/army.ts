import type { ArmyState, PerkId } from '@/types';
import { defenseBudget } from '@/data/defenseBudgets';

export interface UnitDef {
  key: keyof ArmyState;
  label: string;
  emoji: string;
  cost: number;       // millions per buy
  batchSize: number;  // how many units one buy adds (1000 soldiers per infantry buy etc.)
  capitalDmg: number; // damage to capital HP per single unit committed
  longRange: boolean;
  groundOnly: boolean;
  defensive?: boolean;
  strategic?: boolean;
  category: 'land' | 'air' | 'sea' | 'strategic' | 'defense';
  description?: string;
  // Display label for one "unit" — used in commit sliders.
  unitNoun?: string;
}

export const UNITS: UnitDef[] = [
  // Land
  { key: 'infantry', label: 'Infantry Brigade',  emoji: '🪖', cost: 5,    batchSize: 1000, capitalDmg: 0.01, longRange: false, groundOnly: true,  category: 'land', unitNoun: 'soldiers' },
  { key: 'tanks',    label: 'Tank Battalion',    emoji: '🛡️', cost: 25,   batchSize: 5,    capitalDmg: 5,    longRange: false, groundOnly: true,  category: 'land', unitNoun: 'tanks' },
  // Air
  { key: 'fighters', label: 'Fighter Squadron',  emoji: '✈️', cost: 60,   batchSize: 1, capitalDmg: 1,    longRange: true,  groundOnly: false, category: 'air',  unitNoun: 'fighters' },
  { key: 'rafales',  label: 'Rafale Heavy Wing', emoji: '🛫', cost: 110,  batchSize: 1, capitalDmg: 2,    longRange: true,  groundOnly: false, category: 'air',  unitNoun: 'rafales', description: 'Multirole — higher damage, harder to intercept.' },
  { key: 'stealth',  label: 'Stealth Squadron',  emoji: '🦇', cost: 200,  batchSize: 1, capitalDmg: 3,    longRange: true,  groundOnly: false, category: 'air',  unitNoun: 'stealths', description: 'F-35-class. Bypasses 50% of conventional air defense.' },
  { key: 'bombers',  label: 'Bomber Wing',       emoji: '🛩️', cost: 120,  batchSize: 1, capitalDmg: 3,    longRange: true,  groundOnly: false, category: 'air',  unitNoun: 'bombers' },
  // Sea
  { key: 'ships',    label: 'Naval Fleet',       emoji: '🚢', cost: 90,   batchSize: 1, capitalDmg: 1,    longRange: true,  groundOnly: false, category: 'sea',  unitNoun: 'ships' },
  { key: 'subs',     label: 'Submarine',         emoji: '⚓', cost: 180,  batchSize: 1, capitalDmg: 2,    longRange: true,  groundOnly: false, category: 'sea',  unitNoun: 'subs',     description: 'Stealth sea launch — ignores most air defenses.' },
  // Tactical / Strategic
  { key: 'missiles', label: 'Ballistic Missile', emoji: '🚀', cost: 80,   batchSize: 1, capitalDmg: 10,   longRange: true,  groundOnly: false, category: 'strategic', unitNoun: 'missiles' },
  { key: 'nukes',    label: 'Nuclear Warhead',   emoji: '☢️', cost: 0,    batchSize: 1, capitalDmg: 2000, longRange: true,  groundOnly: false, category: 'strategic', strategic: true, unitNoun: 'nukes', description: 'Devastating — not purchasable. Limited by real-world arsenal at game start.' },
  // Defense
  { key: 'airDefense',    label: 'Air Defense Battery', emoji: '🛰️', cost: 90,   batchSize: 1, capitalDmg: 0, longRange: false, groundOnly: false, category: 'defense', defensive: true, unitNoun: 'batteries', description: 'Intercepts ~25% of incoming aircraft per battery.' },
  { key: 'groundDefense', label: 'Fortifications',      emoji: '🧱', cost: 40,   batchSize: 1, capitalDmg: 0, longRange: false, groundOnly: false, category: 'defense', defensive: true, unitNoun: 'forts',     description: 'Hardens borders against ground invasion.' },
  { key: 'ironDomes',     label: 'Iron Dome Battery',   emoji: '🛡️', cost: 1500, batchSize: 1, capitalDmg: 0, longRange: false, groundOnly: false, category: 'defense', defensive: true, unitNoun: 'domes',    description: 'COSTLIEST. Once active, intercepts incoming missiles & nukes at the cost of one missile per attempt.' },
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

export function fightingTotal(a: ArmyState): number {
  return a.infantry + a.tanks + a.fighters + a.stealth + a.rafales + a.bombers + a.ships + a.subs + a.missiles;
}

// Starting army uses the new batch scale: a "starting brigade" is ~2 buys of
// infantry (2000 soldiers), 1 buy of tanks (5 tanks), etc.
export function startingArmy(perks: PerkId[]): ArmyState {
  const base = emptyArmy();
  base.infantry = 2000;
  base.tanks = 5;
  base.fighters = 2;
  base.ships = 1;
  if (perks.includes('militaristic')) {
    base.infantry += 5000;
    base.tanks += 10;
    base.fighters += 3;
    base.ships += 1;
    base.airDefense += 1;
  }
  return base;
}

export function unitCostFor(unit: UnitDef, perks: PerkId[]): number {
  if (unit.strategic) return 0;
  if (perks.includes('diplomat')) return Math.round(unit.cost * 0.8);
  return unit.cost;
}

// Treasury seeded from the real-world defense budget of the country picked.
// US picks → big treasury; Tuvalu picks → modest treasury.
export function startingMoneyForCountry(countryCode: string | null, perks: PerkId[]): number {
  const budget = defenseBudget(countryCode);
  // base 1000M for everyone + scaled portion of real defense budget
  let total = 1000 + Math.round(budget / 150);
  if (perks.includes('wealthy')) total = Math.round(total * 1.5);
  return total;
}

// Per-day passive income derived from the same real-world budget. Big spenders
// get hundreds of millions per day; small states get the base.
export function dailyIncomeForCountry(countryCode: string | null, perks: PerkId[]): number {
  const budget = defenseBudget(countryCode);
  let yield_ = 50 + Math.round(budget / 1500);
  if (perks.includes('wealthy')) yield_ = Math.round(yield_ * 1.25);
  if (perks.includes('industrial')) yield_ += 50;
  return yield_;
}

export function startingMorale(perks: PerkId[]): number {
  return perks.includes('highMorale') ? 85 : 60;
}

export function startingInnovation(perks: PerkId[]): number {
  return perks.includes('innovator') ? 60 : 30;
}
