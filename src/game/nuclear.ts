import { nanoid } from 'nanoid';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { PendingNuke, PlayerState, RoomState } from '@/types';

export const NUKE_CAPITAL_DMG = 60;
export const NUKE_MIN_MORALE = 95;
export const NUKE_MIN_REPUTATION = 95;
export const NUKE_REP_DROP_SOLO_PCT = 0.45;
export const NUKE_REP_DROP_ALLIANCE_PCT = 0.30;

export interface NukeGate {
  ok: boolean;
  reason?: string;
}

export function canLaunchNuke(player: PlayerState): NukeGate {
  if (player.army.nukes <= 0) return { ok: false, reason: 'No warheads in arsenal.' };
  if (player.morale < NUKE_MIN_MORALE) {
    return { ok: false, reason: `Morale must be ≥ ${NUKE_MIN_MORALE} (currently ${Math.round(player.morale)}).` };
  }
  if (player.reputation < NUKE_MIN_REPUTATION) {
    return { ok: false, reason: `Reputation must be ≥ ${NUKE_MIN_REPUTATION} (currently ${Math.round(player.reputation)}).` };
  }
  return { ok: true };
}

export function isAllianceMember(room: RoomState, uid: string): boolean {
  const p = room.players[uid];
  if (!p || !p.allianceId) return false;
  return !!room.alliances[p.allianceId];
}

export function allianceMembers(room: RoomState, uid: string): string[] {
  const p = room.players[uid];
  if (!p || !p.allianceId) return [];
  const a = room.alliances[p.allianceId];
  return a?.memberIds ?? [];
}

// Proposal — all alliance members must approve. Solo players skip this step.
export function makeProposal(
  proposer: PlayerState,
  targetCode: string,
  targetPlayerId: string | null,
  day: number
): PendingNuke {
  return {
    id: nanoid(8),
    proposerId: proposer.uid,
    proposerCountry: proposer.countryCode ?? '??',
    targetCode,
    targetPlayerId,
    approvedBy: [proposer.uid],
    createdAt: Date.now(),
    day,
  };
}

export function isProposalApproved(room: RoomState, proposal: PendingNuke): boolean {
  const members = allianceMembers(room, proposal.proposerId);
  if (members.length === 0) return true; // solo
  return members.every((m) => proposal.approvedBy.includes(m));
}

// Apply the reputation drop from launching a nuke.
export function applyReputationDrop(player: PlayerState, room: RoomState): number {
  const drop = isAllianceMember(room, player.uid) ? NUKE_REP_DROP_ALLIANCE_PCT : NUKE_REP_DROP_SOLO_PCT;
  return Math.max(0, Math.round(player.reputation * (1 - drop)));
}

export function countryNukes(code: string): number {
  return COUNTRY_BY_CODE[code]?.nukes ?? 0;
}
