import { nanoid } from 'nanoid';
import type { ArmyState, BuildOrder, PlayerState } from '@/types';

// Base production time per unit type, in hours of game time (1 game day = 24h
// wall clock by default, so a stealth squadron is a half-day project).
export const BASE_BUILD_HOURS: Record<keyof ArmyState, number> = {
  infantry: 2,
  tanks: 4,
  fighters: 6,
  rafales: 8,
  stealth: 12,
  bombers: 10,
  ships: 10,
  subs: 12,
  missiles: 6,
  nukes: 0,          // not buildable
  airDefense: 6,
  groundDefense: 3,
  ironDomes: 12,
};

// Morale-driven speed: factor = 1.6 - morale/100.
//   morale 100 → 0.6x (fast) · morale 60 → 1.0x · morale 20 → 1.4x (slow)
// Industrial perk shaves a further 25% off, floor at 0.4x.
export function buildSpeedFactor(player: PlayerState): number {
  let factor = 1.6 - player.morale / 100;
  if (player.perks.includes('industrial')) factor *= 0.75;
  return Math.max(0.4, factor);
}

export function buildDurationMs(unitKey: keyof ArmyState, player: PlayerState): number {
  const hours = BASE_BUILD_HOURS[unitKey] ?? 4;
  return Math.round(hours * buildSpeedFactor(player) * 3_600_000);
}

export function makeBuildOrder(
  unitKey: keyof ArmyState,
  qty: number,
  player: PlayerState,
  elapsedMs: number,
): BuildOrder {
  return {
    id: nanoid(8),
    unitKey,
    qty,
    placedAtElapsedMs: elapsedMs,
    readyAtElapsedMs: elapsedMs + buildDurationMs(unitKey, player),
  };
}

// Split a queue into done vs still-building at the given game-elapsed time.
export function splitQueue(queue: BuildOrder[], elapsedMs: number): {
  done: BuildOrder[];
  pending: BuildOrder[];
} {
  const done: BuildOrder[] = [];
  const pending: BuildOrder[] = [];
  for (const o of queue) (o.readyAtElapsedMs <= elapsedMs ? done : pending).push(o);
  return { done, pending };
}

export function formatBuildEta(remainingMs: number): string {
  const s = Math.max(0, Math.ceil(remainingMs / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${(s % 60).toString().padStart(2, '0')}s`;
  return `${s}s`;
}
