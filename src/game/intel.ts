import type { ArmyState, PlayerState } from '@/types';

// Intelligence ops — pay to reveal another player's army composition.
// Result is shown only to the buyer; no other players see it.

export const INTEL_COST_ARMY = 300;       // $M
export const INTEL_COST_BUDGET = 150;     // $M
export const INTEL_COST_FULL = 600;       // $M — army + budget + camps summary

export interface IntelReport {
  targetUid: string;
  army?: ArmyState;
  money?: number;
  innovation?: number;
  morale?: number;
  reputation?: number;
  campsCount?: number;
  takenAtDay: number;
  takenAtTs: number;
}

export function buildReport(
  target: PlayerState,
  kind: 'army' | 'budget' | 'full',
  day: number
): IntelReport {
  const base: IntelReport = { targetUid: target.uid, takenAtDay: day, takenAtTs: Date.now() };
  if (kind === 'army' || kind === 'full') {
    base.army = { ...target.army };
    base.campsCount = target.camps.length;
  }
  if (kind === 'budget' || kind === 'full') {
    base.money = target.money;
    base.innovation = target.innovation;
    base.morale = target.morale;
    base.reputation = target.reputation;
  }
  return base;
}

export function intelCost(kind: 'army' | 'budget' | 'full'): number {
  return kind === 'army' ? INTEL_COST_ARMY
    : kind === 'budget' ? INTEL_COST_BUDGET
    : INTEL_COST_FULL;
}
