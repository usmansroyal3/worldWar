import { COUNTRY_BY_CODE } from '@/data/countries';
import type { CountryDef } from '@/data/countries';
import type { PlayerState, Relationship, RoomState } from '@/types';

// Returns the displayed relationship of `viewCode` from `playerCountry`'s perspective.
// Rules (in priority order):
//   1. Self: same country -> 'self'
//   2. Owned by friendly player / same alliance -> 'friendly'
//   3. Owned by enemy player (any other player who isn't an ally) -> 'enemy'
//   4. NPC: explicit rival/ally lists override blocs
//   5. NPC: shared bloc with player -> 'friendly'
//   6. NPC: opposed blocs -> 'enemy'
//   7. Otherwise -> 'neutral'
//
// "Opposed blocs" pairs reflect current real-world geopolitical fault lines and are
// used only when neither side is in a player's hard ally/rival list.
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

export function getRelationship(
  room: RoomState,
  viewerCountryCode: string,
  targetCountryCode: string
): Relationship {
  if (viewerCountryCode === targetCountryCode) return 'self';
  const viewer = COUNTRY_BY_CODE[viewerCountryCode];
  const target = COUNTRY_BY_CODE[targetCountryCode];
  if (!viewer || !target) return 'neutral';

  // Find the player (if any) controlling the target country.
  const targetOwner = Object.values(room.players).find(
    (p) => p.countryCode === targetCountryCode || p.territories.includes(targetCountryCode)
  );
  const viewerOwner = Object.values(room.players).find((p) => p.countryCode === viewerCountryCode);

  if (targetOwner && viewerOwner && targetOwner.uid !== viewerOwner.uid) {
    // Player-vs-player: friendly only if in the same alliance.
    if (
      viewerOwner.allianceId &&
      targetOwner.allianceId &&
      viewerOwner.allianceId === targetOwner.allianceId
    ) {
      return 'friendly';
    }
    return 'enemy';
  }

  // NPC target. Acceptance can be modified by diplomacy — pull live value if it exists.
  const npc = room.npc[targetCountryCode];
  if (npc) {
    if (npc.acceptance >= 90) return 'friendly';
    if (npc.acceptance <= 10) return 'enemy';
    // Mid-range: still resolve via real-world defaults so a "neutral 50" doesn't paint everything white.
  }

  return defaultNpcRelationship(viewer, target);
}

export function defaultNpcRelationship(viewer: CountryDef, target: CountryDef): Relationship {
  if (viewer.allies.includes(target.code)) return 'friendly';
  if (viewer.rivals.includes(target.code)) return 'enemy';
  if (target.allies.includes(viewer.code)) return 'friendly';
  if (target.rivals.includes(viewer.code)) return 'enemy';
  if (blocsOppose(viewer.blocs, target.blocs)) return 'enemy';
  if (shareBloc(viewer.blocs, target.blocs)) return 'friendly';
  return 'neutral';
}

// Compute starting acceptance (0-100) for an NPC vs a player's country.
// Friendly defaults around 70-80, enemy around 15-25, neutral around 45-55.
export function initialAcceptance(viewerCode: string, targetCode: string): number {
  const viewer = COUNTRY_BY_CODE[viewerCode];
  const target = COUNTRY_BY_CODE[targetCode];
  if (!viewer || !target) return 50;
  const rel = defaultNpcRelationship(viewer, target);
  if (rel === 'friendly') return 75;
  if (rel === 'enemy') return 20;
  return 50;
}

// Map UI colour for a relationship from the viewer's POV.
export const RELATIONSHIP_COLOR: Record<Relationship, string> = {
  self: '#3b82f6',     // accent blue
  friendly: '#22c55e', // green
  enemy: '#ef4444',    // red
  neutral: '#e5e7eb',  // white-ish
};

// Convenience helper: does the viewer share a land border with the target *via owned territory*?
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

// Numeric 0-100 relationship rating from viewer's POV.
// >75 friendly, 40-75 neutral, <40 enemy (per spec).
export function relationshipRating(
  room: RoomState,
  viewerCode: string,
  targetCode: string
): number {
  if (viewerCode === targetCode) return 100;
  const viewer = COUNTRY_BY_CODE[viewerCode];
  const target = COUNTRY_BY_CODE[targetCode];
  if (!viewer || !target) return 50;

  // Player-controlled target: alliance status dominates.
  const targetOwner = Object.values(room.players).find(
    (p) => p.countryCode === targetCode || p.territories.includes(targetCode)
  );
  const viewerOwner = Object.values(room.players).find((p) => p.countryCode === viewerCode);
  if (targetOwner && viewerOwner && targetOwner.uid !== viewerOwner.uid) {
    if (
      viewerOwner.allianceId &&
      targetOwner.allianceId &&
      viewerOwner.allianceId === targetOwner.allianceId
    ) {
      return 92;
    }
    return 18;
  }

  // NPC: prefer live acceptance if set; otherwise compute from defaults.
  const npc = room.npc[targetCode];
  if (npc) return npc.acceptance;
  const rel = defaultNpcRelationship(viewer, target);
  if (rel === 'friendly') return 80;
  if (rel === 'enemy') return 18;
  return 55;
}

export function relationshipLabel(rating: number): 'friendly' | 'neutral' | 'enemy' {
  if (rating > 75) return 'friendly';
  if (rating < 40) return 'enemy';
  return 'neutral';
}
