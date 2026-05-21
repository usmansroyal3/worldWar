import type { PlayerState } from '@/types';

// Daily tick applied once per game day, per player. Returns the patch that
// should be merged into the player document, or null if no change is needed.
// Called by the client whose player is `me` when the game clock advances
// past me.daily.lastResetDay. The lastResetDay guard prevents double-apply
// across multiple windows.
export function dailyTickPatch(me: PlayerState, currentDay: number): Partial<PlayerState> | null {
  if (me.daily.lastResetDay >= currentDay) return null;

  let morale = me.morale;
  let reputation = me.reputation;

  // High reputation lifts morale (user spec: rep >= 80 → +5 morale/day)
  if (reputation >= 80) morale += 5;
  // High morale lifts reputation, gradually
  if (morale >= 80) reputation += 2;
  // Low morale slowly bleeds reputation
  if (morale <= 20) reputation -= 2;
  // Low reputation slowly bleeds morale
  if (reputation <= 20) morale -= 2;

  morale = clamp(morale, 0, 100);
  reputation = clamp(reputation, 0, 100);

  // Industrial perk: a free "production token" — apply as a small treasury yield
  // representing efficient war-economy output (simple stub).
  let money = me.money;
  if (me.perks.includes('industrial')) money += 50;
  if (me.perks.includes('wealthy')) money += 25;

  // Iron Dome upkeep — if active days remaining > 0, decrement after the day rolls.
  let ironDome = me.ironDome;
  if (ironDome.activeUntilDay > 0 && currentDay > ironDome.activeUntilDay) {
    // expired
    ironDome = { activeUntilDay: 0, interceptsToday: 0 };
  } else if (ironDome.activeUntilDay >= currentDay) {
    ironDome = { ...ironDome, interceptsToday: 0 };
  }

  return {
    morale,
    reputation,
    money,
    ironDome,
    daily: { speechUsed: false, lastResetDay: currentDay },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
