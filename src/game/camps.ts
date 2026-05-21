import { nanoid } from 'nanoid';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { emptyArmy } from './army';
import type { ArmyCamp, PlayerState, RoomState } from '@/types';
import { getRelationship } from './relationships';

export const CAMP_COST = 200;        // millions to deploy a camp
export const AIRSTRIP_COST = 300;    // millions to upgrade with airstrip
export const MAX_CAMPS_PER_COUNTRY = 5;
export const CAMP_MAX_HP = 2000;

export function makeCamp(hostCountryCode: string, day: number): ArmyCamp {
  return {
    id: nanoid(8),
    hostCountryCode,
    hp: CAMP_MAX_HP,
    maxHp: CAMP_MAX_HP,
    hasAirstrip: false,
    garrison: emptyArmy(),
    createdDay: day,
  };
}

export function campsInCountry(player: PlayerState, code: string): ArmyCamp[] {
  return player.camps.filter((c) => c.hostCountryCode === code);
}

export function canDeployCampIn(
  room: RoomState,
  player: PlayerState,
  code: string
): { ok: boolean; reason?: string } {
  if (!player.countryCode) return { ok: false, reason: 'Pick a country first.' };
  if (code === player.countryCode) return { ok: false, reason: 'You already control your home country.' };
  const rel = getRelationship(room, player.countryCode, code);
  if (rel !== 'friendly') return { ok: false, reason: 'Camps can only be placed in friendly nations.' };
  if (campsInCountry(player, code).length >= MAX_CAMPS_PER_COUNTRY) {
    return { ok: false, reason: `Max ${MAX_CAMPS_PER_COUNTRY} camps per country.` };
  }
  if (player.money < CAMP_COST) return { ok: false, reason: `Need $${CAMP_COST}M.` };
  return { ok: true };
}

// Returns the set of country codes from which the player can launch ground attacks.
// Includes their home country + any owned territories + any country hosting a camp.
export function groundLaunchOrigins(player: PlayerState): Set<string> {
  const set = new Set<string>();
  if (player.countryCode) set.add(player.countryCode);
  player.territories.forEach((t) => set.add(t));
  player.camps.forEach((c) => set.add(c.hostCountryCode));
  return set;
}

// Does the player share a land border with `target` through any owned territory
// or via a camp's host country? This is the rule that lets you ground-invade
// Saudi Arabia from India by having a camp in UAE (UAE borders SA).
export function hasGroundReachTo(player: PlayerState, target: string): boolean {
  const origins = groundLaunchOrigins(player);
  for (const o of origins) {
    const def = COUNTRY_BY_CODE[o];
    if (def?.borders.includes(target)) return true;
  }
  return false;
}
