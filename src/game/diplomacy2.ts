// Player-vs-player diplomacy. Distinct from the existing NPC `diplomacy.ts`
// (which handles military/peace/tourism ADVANCES to NPC nations).
//
// Each pair of players has a status: peace (default), war (active),
// ceasefire (mutually-agreed pause). Declarations are public news events.
// Breaking a ceasefire burns reputation.

import type { DiplomaticState, DiplomaticStatus, RoomState } from '@/types';

export const WAR_BREAK_REP_PENALTY = 30;   // surprise attack while at peace
export const CEASEFIRE_BREAK_PENALTY = 40; // breaking a ceasefire
export const PEACE_REP_BONUS_PER_DAY = 2;  // tiny daily reward for honoring peace

// Deterministic key for a pair of uids.
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`;
}

export function getStatus(room: RoomState, a: string, b: string): DiplomaticStatus {
  if (a === b) return 'peace';
  const s = room.diplomacy?.[pairKey(a, b)];
  return s?.status ?? 'peace';
}

export function makeDeclaration(by: string, status: DiplomaticStatus): DiplomaticState {
  return { status, declaredAt: Date.now(), declaredBy: by };
}
