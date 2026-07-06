import type { PlayerState } from '@/types';
import { dailyIncomeForCountry } from './army';
import { moraleLossFromFatigue } from './fatigue';
import { PEACE_REP_BONUS_PER_DAY } from './diplomacy2';

// Per-player daily tick — applied once per game day per player.
// Returns the patch that should be merged into the player document,
// or null if no change is needed. Race-safe via lastResetDay guard.
export function dailyTickPatch(me: PlayerState, currentDay: number): Partial<PlayerState> | null {
  if (me.daily.lastResetDay >= currentDay) return null;

  let morale = me.morale;
  let reputation = me.reputation;

  // High reputation lifts morale (rep >= 80 → +5 morale/day)
  if (reputation >= 80) morale += 5;
  // High morale lifts reputation, gradually
  if (morale >= 80) reputation += 2;
  // Low morale slowly bleeds reputation
  if (morale <= 20) reputation -= 2;
  // Low reputation slowly bleeds morale
  if (reputation <= 20) morale -= 2;

  // War fatigue — strikes launched yesterday cost morale today.
  if (me.fatigueToday > 0) morale -= moraleLossFromFatigue(me.fatigueToday);

  // Diplomatic peace bonus: small daily +rep just for not declaring war.
  // (Honor-the-peace reward.) Capped so it's a slow drift.
  if (reputation < 90) reputation += PEACE_REP_BONUS_PER_DAY * 0.5;

  morale = clamp(morale, 0, 100);
  reputation = clamp(reputation, 0, 100);

  // Daily income — base + scaled portion of defense budget. Big spenders
  // get rich daily yields.
  const income = dailyIncomeForCountry(me.countryCode, me.perks);
  const money = me.money + income;

  // Iron Dome upkeep — decrement after the day rolls.
  let ironDome = me.ironDome;
  if (ironDome.activeUntilDay > 0 && currentDay > ironDome.activeUntilDay) {
    ironDome = { activeUntilDay: 0, interceptsToday: 0 };
  } else if (ironDome.activeUntilDay >= currentDay) {
    ironDome = { ...ironDome, interceptsToday: 0 };
  }

  return {
    morale,
    reputation,
    money,
    ironDome,
    fatigueToday: 0,
    daily: { speechUsed: false, lastResetDay: currentDay, buildsToday: 0, advancesToday: 0, missionClaimed: false },
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
