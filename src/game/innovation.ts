import type { ArmyState, PlayerState } from '@/types';

// Research project — spend money to gain innovation points. Diminishing returns
// past 75 to prevent runaway research dominance.
export const RESEARCH_PROJECTS = [
  { id: 'basic', label: 'Basic R&D', cost: 80,  gain: 10, desc: 'Steady progress on industrial tech.' },
  { id: 'adv',   label: 'Advanced lab', cost: 200, gain: 20, desc: 'Breakthrough materials and propulsion.' },
  { id: 'top',   label: 'Top-secret program', cost: 500, gain: 35, desc: 'Black-budget weapons science.' },
];

// Minimum innovation required to BUILD a given unit. The actual building
// uses these — defenses + basic units have no gate.
const UNIT_GATES: Partial<Record<keyof ArmyState, number>> = {
  rafales: 30,
  stealth: 65,
  subs: 50,
  bombers: 25,
  ironDomes: 70,
  airDefense: 20,
};

export function unitInnovationGate(key: keyof ArmyState): number {
  return UNIT_GATES[key] ?? 0;
}

export function canBuildUnit(player: PlayerState, key: keyof ArmyState): { ok: boolean; need?: number } {
  const need = unitInnovationGate(key);
  if (player.innovation >= need) return { ok: true };
  return { ok: false, need };
}

// Nuke gate already requires morale/rep 95+; innovation just unlocks the launcher UI.
export const NUKE_INNOVATION_GATE = 40;

// Diminishing returns past 75 — research above gives 50% of the listed gain.
export function effectiveGain(currentInnovation: number, listedGain: number): number {
  if (currentInnovation < 75) return listedGain;
  return Math.round(listedGain * 0.5);
}
