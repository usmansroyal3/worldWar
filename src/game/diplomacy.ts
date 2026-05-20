import type { AdvanceKind, PlayerState } from '@/types';

// Diplomatic advance to a neutral/NPC country.
// Outcome is based on a stochastic check against current acceptance.
//   - acceptance >= 70 -> almost certain success
//   - acceptance <= 30 -> almost certain rejection
// Cost is paid up-front; rejection refunds nothing and dents domestic morale.
export interface AdvanceDef {
  kind: AdvanceKind;
  label: string;
  emoji: string;
  cost: number;
  acceptanceDelta: number;  // bonus to acceptance roll on success
  rejectMoralePenalty: number;
  rejectReputationPenalty: number;
}

export const ADVANCES: Record<AdvanceKind, AdvanceDef> = {
  military: {
    kind: 'military',
    label: 'Military Support',
    emoji: '🛡️',
    cost: 100,
    acceptanceDelta: 25,
    rejectMoralePenalty: 5,
    rejectReputationPenalty: 3,
  },
  peace: {
    kind: 'peace',
    label: 'Peace Talks',
    emoji: '🕊️',
    cost: 50,
    acceptanceDelta: 15,
    rejectMoralePenalty: 2,
    rejectReputationPenalty: 5,
  },
  tourism: {
    kind: 'tourism',
    label: 'Tourism Boost',
    emoji: '🌴',
    cost: 30,
    acceptanceDelta: 10,
    rejectMoralePenalty: 1,
    rejectReputationPenalty: 2,
  },
};

export interface AdvanceResolution {
  accepted: boolean;
  newAcceptance: number;
  moraleDelta: number;
  reputationDelta: number;
  reason: string;
}

// Resolve an advance against a current acceptance score.
export function resolveAdvance(
  player: PlayerState,
  currentAcceptance: number,
  kind: AdvanceKind,
  rng = Math.random
): AdvanceResolution {
  const def = ADVANCES[kind];
  let chance = currentAcceptance + def.acceptanceDelta;
  if (player.perks.includes('diplomat')) chance += 10;
  // Reputation also weighs in a little.
  chance += (player.reputation - 50) * 0.2;
  const roll = rng() * 100;
  const accepted = roll <= chance;
  if (accepted) {
    return {
      accepted: true,
      newAcceptance: Math.min(100, currentAcceptance + def.acceptanceDelta),
      moraleDelta: 2,
      reputationDelta: 1,
      reason: `${def.label} accepted (rolled ${Math.round(roll)} ≤ ${Math.round(chance)})`,
    };
  }
  return {
    accepted: false,
    newAcceptance: Math.max(0, currentAcceptance - 5),
    moraleDelta: -def.rejectMoralePenalty,
    reputationDelta: -def.rejectReputationPenalty,
    reason: `${def.label} rejected (rolled ${Math.round(roll)} > ${Math.round(chance)})`,
  };
}
