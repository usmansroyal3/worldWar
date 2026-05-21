import { COUNTRY_BY_CODE } from '@/data/countries';
import type { ArmyState, PlayerState, RoomState } from '@/types';
import { getRelationship } from './relationships';
import { UNITS, unitCostFor, type UnitDef } from './army';

// Market — what each country offers, and the discount a player gets buying it.
//
// Eligibility:
//   - Buyer must have relationship ≥ "friendly" with the seller (acceptance ≥ 90
//     OR the seller is in a player's same alliance OR the seller is a hard ally).
// Discount tiers:
//   - friendly (>=90 acceptance / bloc / ally): 15% off base cost
//   - perk 'diplomat' stacks: extra 10% off
// Specialties:
//   - Each country specialises in a subset of unit categories (cheaper there).

const SPECIALTIES: Record<string, Array<keyof ArmyState>> = {
  US: ['stealth', 'fighters', 'ships', 'subs', 'missiles'],
  RU: ['tanks', 'missiles', 'fighters', 'subs'],
  FR: ['rafales', 'fighters', 'subs'],
  GB: ['ships', 'subs', 'fighters'],
  CN: ['missiles', 'tanks', 'fighters'],
  IN: ['rafales', 'missiles', 'infantry'],
  IL: ['ironDomes', 'airDefense', 'stealth'],
  DE: ['tanks', 'subs', 'airDefense'],
  KR: ['fighters', 'tanks', 'missiles'],
  JP: ['airDefense', 'ships', 'subs'],
  TR: ['infantry', 'tanks', 'fighters'],
  IT: ['rafales', 'ships', 'fighters'],
  SE: ['fighters', 'subs'],
  CH: ['airDefense'],
};

export interface MarketOffer {
  unit: UnitDef;
  finalPrice: number;
  discountPct: number;
  specialty: boolean;
}

export function isMarketAccessible(
  room: RoomState,
  buyer: PlayerState,
  sellerCode: string
): boolean {
  if (!buyer.countryCode) return false;
  if (buyer.countryCode === sellerCode) return false;
  const rel = getRelationship(room, buyer.countryCode, sellerCode);
  return rel === 'friendly';
}

export function listOffers(
  room: RoomState,
  buyer: PlayerState,
  sellerCode: string
): MarketOffer[] {
  if (!isMarketAccessible(room, buyer, sellerCode)) return [];
  const specialties = new Set(SPECIALTIES[sellerCode] ?? []);
  return UNITS.filter((u) => !u.strategic).map((u) => {
    let base = unitCostFor(u, buyer.perks);
    let discount = 0.15;
    if (specialties.has(u.key)) discount += 0.15;
    if (buyer.perks.includes('diplomat')) discount += 0.10;
    const final = Math.max(1, Math.round(base * (1 - discount)));
    return {
      unit: u,
      finalPrice: final,
      discountPct: Math.round(discount * 100),
      specialty: specialties.has(u.key),
    };
  });
}

// Aggregate: which sellers a buyer can shop from right now.
export function listSellers(room: RoomState, buyer: PlayerState): string[] {
  const out: string[] = [];
  Object.keys(COUNTRY_BY_CODE).forEach((code) => {
    if (isMarketAccessible(room, buyer, code)) out.push(code);
  });
  // Sort by specialty count desc (richer arsenals first), then by name.
  return out.sort((a, b) => {
    const sa = (SPECIALTIES[a] ?? []).length;
    const sb = (SPECIALTIES[b] ?? []).length;
    if (sa !== sb) return sb - sa;
    return COUNTRY_BY_CODE[a].name.localeCompare(COUNTRY_BY_CODE[b].name);
  });
}
