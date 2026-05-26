import { COUNTRY_BY_CODE } from '@/data/countries';
import type { CountryDef } from '@/data/countries';
import type { PlayerState, Relationship, RoomState } from '@/types';

// Bloc-fault lines used as a tie-breaker when neither side has the other in
// its hard ally/rival list. These mirror current real-world geopolitical
// fault lines.
const OPPOSED_BLOCS: Array<[string, string]> = [
  ['NATO', 'CSTO'],
  ['West', 'CSTO'],
  ['NATO', 'SCO'],
  ['West', 'SCO'],
  ['GCC', 'SCO'],
  ['FiveEyes', 'BRICS'],
];

function blocsOppose(a: string[], b: string[]): boolean {
  for (const [x, y] of OPPOSED_BLOCS) {
    if ((a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x))) return true;
  }
  return false;
}

function shareBloc(a: string[], b: string[]): boolean {
  return a.some((bloc) => b.includes(bloc));
}

// ----------------------------------------------------------------------------
// Single source of truth for relationship semantics.
//
// Numeric "rating" is 0-100. A single threshold set is shared between the
// rating display and the map colour so they NEVER disagree:
//   > 75      → friendly  (green)
//   40..75    → neutral   (white)
//   < 40      → enemy     (red)
//   self      → 'self'    (blue)
//
// Real-world defaults seed the rating, alliance choices and live diplomatic
// acceptance can shift it.
// ----------------------------------------------------------------------------

export function defaultNpcRelationship(viewer: CountryDef, target: CountryDef): Relationship {
  if (viewer.allies.includes(target.code)) return 'friendly';
  if (viewer.rivals.includes(target.code)) return 'enemy';
  if (target.allies.includes(viewer.code)) return 'friendly';
  if (target.rivals.includes(viewer.code)) return 'enemy';
  if (blocsOppose(viewer.blocs, target.blocs)) return 'enemy';
  if (shareBloc(viewer.blocs, target.blocs)) return 'friendly';
  return 'neutral';
}

// Numeric rating used for the on-map tint AND the CountryDetail bar.
export function relationshipRating(
  room: RoomState,
  viewerCode: string,
  targetCode: string
): number {
  if (viewerCode === targetCode) return 100;
  const viewer = COUNTRY_BY_CODE[viewerCode];
  const target = COUNTRY_BY_CODE[targetCode];
  if (!viewer || !target) return 50;

  const targetOwner = Object.values(room.players).find(
    (p) => p.countryCode === targetCode || p.territories.includes(targetCode)
  );
  const viewerOwner = Object.values(room.players).find((p) => p.countryCode === viewerCode);

  // Player-vs-player handling
  if (targetOwner && viewerOwner && targetOwner.uid !== viewerOwner.uid) {
    // Same alliance: strong friendly
    if (viewerOwner.allianceId && targetOwner.allianceId
        && viewerOwner.allianceId === targetOwner.allianceId) {
      return 92;
    }
    // Both in different declared alliances: explicit enemy sides
    if (viewerOwner.allianceId && targetOwner.allianceId
        && viewerOwner.allianceId !== targetOwner.allianceId) {
      return 18;
    }
    // Otherwise: fall through to real-world default between their two countries.
    // (Two solo players or one solo / one in an alliance.)
  }

  // Live NPC acceptance overrides the default once diplomacy has moved it.
  const npc = room.npc[targetCode];
  if (npc) return clamp(npc.acceptance, 0, 100);

  // Real-world default
  const rel = defaultNpcRelationship(viewer, target);
  if (rel === 'friendly') return 85;
  if (rel === 'enemy') return 18;
  return 55;
}

export function relationshipLabel(rating: number): 'friendly' | 'neutral' | 'enemy' {
  if (rating > 75) return 'friendly';
  if (rating < 40) return 'enemy';
  return 'neutral';
}

export function getRelationship(
  room: RoomState,
  viewerCountryCode: string,
  targetCountryCode: string
): Relationship {
  if (viewerCountryCode === targetCountryCode) return 'self';
  const rating = relationshipRating(room, viewerCountryCode, targetCountryCode);
  return relationshipLabel(rating);
}

// Starting acceptance when game begins. The same numeric scale as the rating
// (so the map and detail panel stay consistent).
export function initialAcceptance(viewerCode: string, targetCode: string): number {
  const viewer = COUNTRY_BY_CODE[viewerCode];
  const target = COUNTRY_BY_CODE[targetCode];
  if (!viewer || !target) return 55;
  const rel = defaultNpcRelationship(viewer, target);
  if (rel === 'friendly') return 85;
  if (rel === 'enemy') return 18;
  return 55;
}

// Map UI colour for a relationship from the viewer's POV.
export const RELATIONSHIP_COLOR: Record<Relationship, string> = {
  self: '#3b82f6',
  friendly: '#22c55e',
  enemy: '#ef4444',
  neutral: '#e5e7eb',
};

// Does the viewer share a land border with the target via owned territory?
export function viewerSharesLandBorder(
  room: RoomState,
  viewer: PlayerState,
  targetCode: string
): boolean {
  const ownedSet = new Set<string>([viewer.countryCode!, ...viewer.territories]);
  for (const owned of ownedSet) {
    const def = COUNTRY_BY_CODE[owned];
    if (def?.borders.includes(targetCode)) return true;
  }
  return false;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
