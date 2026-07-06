// War fatigue: every point of capital damage dealt today subtracts a fraction
// of morale at the next day-tick. Discourages constant aggression — pacifists
// can keep morale high; warmongers slowly bleed it.

export const FATIGUE_PER_DMG = 0.15; // 1 point of dmg → 0.15 morale loss next day

export function moraleLossFromFatigue(damageDealtToday: number): number {
  return Math.round(damageDealtToday * FATIGUE_PER_DMG);
}
