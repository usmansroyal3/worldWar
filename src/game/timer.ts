import type { RoomState } from '@/types';

// Convert a Firestore Timestamp | number to epoch ms (Firestore Timestamps
// have a .toMillis() method when alive; we accept either shape).
export function tsToMs(t: RoomState['startedAt']): number | null {
  if (t == null) return null;
  if (typeof t === 'number') return t;
  // Firestore Timestamp
  const anyT = t as { toMillis?: () => number; seconds?: number };
  if (typeof anyT.toMillis === 'function') return anyT.toMillis();
  if (typeof anyT.seconds === 'number') return anyT.seconds * 1000;
  return null;
}

export interface GameClock {
  // 1-indexed day number (Day 1 starts immediately on game start)
  day: number;
  // milliseconds remaining in the current day
  msIntoDay: number;
  msUntilNextDay: number;
  // True war phase status
  phase: 'preparation' | 'war' | 'ended';
  // Total days configured
  prepDays: number;
  warDays: number;
}

export function computeGameClock(room: RoomState, nowMs: number): GameClock | null {
  const start = tsToMs(room.startedAt);
  if (start == null) return null;
  const elapsed = Math.max(0, nowMs - start);
  const dayLen = room.dayLengthMs;
  const dayIndex = Math.floor(elapsed / dayLen); // 0-indexed
  const msIntoDay = elapsed - dayIndex * dayLen;
  const msUntilNextDay = dayLen - msIntoDay;
  const total = room.prepDays + room.warDays;
  const day = dayIndex + 1;
  let phase: GameClock['phase'];
  if (day > total) phase = 'ended';
  else if (day > room.prepDays) phase = 'war';
  else phase = 'preparation';
  return {
    day: Math.min(day, total + 1),
    msIntoDay,
    msUntilNextDay,
    phase,
    prepDays: room.prepDays,
    warDays: room.warDays,
  };
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${sec.toString().padStart(2, '0')}s`;
  return `${m}m ${sec.toString().padStart(2, '0')}s`;
}
