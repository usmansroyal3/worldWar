import type { Timestamp } from 'firebase/firestore';

export type Phase = 'lobby' | 'preparation' | 'war' | 'ended';

export type Relationship = 'friendly' | 'enemy' | 'neutral' | 'self';

export interface Perk {
  id: PerkId;
  name: string;
  description: string;
  emoji: string;
}

export type PerkId =
  | 'wealthy'
  | 'highMorale'
  | 'innovator'
  | 'diplomat'
  | 'industrial'
  | 'militaristic';

// Army units — expanded with modern equipment and nuclear/Iron Dome
export interface ArmyState {
  infantry: number;
  tanks: number;
  fighters: number;
  stealth: number;     // F-35-class stealth multirole
  rafales: number;     // Rafale-class heavy multirole
  bombers: number;
  ships: number;
  subs: number;        // submarines
  missiles: number;
  // Strategic
  nukes: number;       // remaining nuclear warheads
  // Defensive
  airDefense: number;  // Patriot / S-400 class
  groundDefense: number; // tank traps, fortifications
  ironDomes: number;   // Iron Dome batteries (1+ allows activation)
}

export interface CapitalState {
  hp: number;          // starts at 10 000
  maxHp: number;
}

export interface DailyFlags {
  speechUsed: boolean;
  lastResetDay: number;   // last day a daily tick was applied to THIS player
}

export interface ArmyCamp {
  id: string;
  hostCountryCode: string;  // friendly country code where camp is hosted
  hp: number;
  maxHp: number;            // 2000
  hasAirstrip: boolean;
  garrison: ArmyState;      // units stationed at this camp
  createdDay: number;
}

export interface IronDomeState {
  activeUntilDay: number;   // 0 = inactive; otherwise day until which the dome is active
  interceptsToday: number;  // counter that resets at end of day
}

export interface PlayerState {
  uid: string;
  name: string;
  joinedAt: number;
  ready: boolean;
  countryCode: string | null;
  allianceId: string | null;
  perks: PerkId[];
  morale: number;
  reputation: number;
  money: number;
  innovation: number;
  army: ArmyState;
  capital: CapitalState;
  territories: string[];
  daily: DailyFlags;
  // New systems
  camps: ArmyCamp[];
  ironDome: IronDomeState;
}

export interface AllianceState {
  id: string;
  name: string;
  founderId: string;
  memberIds: string[];
}

export type AdvanceKind = 'military' | 'peace' | 'tourism';

export interface NpcRelation {
  acceptance: number;
  lastAdvanceDay?: number;
}

export type SpeechKind = 'hate' | 'motivation' | 'solidarity';

export type NewsKind =
  | 'speech'
  | 'build'
  | 'attack'
  | 'advance'
  | 'alliance'
  | 'system'
  | 'nuke'
  | 'intercept'
  | 'camp';

export interface NewsItem {
  id: string;
  authorId: string;
  authorName: string;
  authorCountry: string | null;
  createdAt: number;
  day: number;
  kind: NewsKind;
  title: string;
  body: string;
  inspiredBy?: string[];
  // meta carries optional structured payload used by animations + UI
  // (e.g. routeFrom/routeTo ISO codes for attack-route polyline)
  meta?: Record<string, string | number | boolean | null>;
}

export interface MoveItem {
  id: string;
  authorId: string;
  createdAt: number;
  day: number;
  kind: 'build' | 'attack' | 'missile' | 'advance' | 'transfer' | 'speech' | 'nuke';
  payload: Record<string, unknown>;
}

// Pending alliance vote on a nuclear strike. Approval-required when proposer is in an alliance.
export interface PendingNuke {
  id: string;
  proposerId: string;
  proposerCountry: string;
  targetCode: string;       // country code being struck
  targetPlayerId: string | null; // if the target is player-owned
  approvedBy: string[];     // alliance member uids who have signed off
  createdAt: number;
  day: number;
}

export interface RoomState {
  id: string;
  adminId: string;
  createdAt: Timestamp | number;
  status: Phase;
  prepDays: number;
  warDays: number;
  startedAt: Timestamp | number | null;
  dayLengthMs: number;
  players: Record<string, PlayerState>;
  alliances: Record<string, AllianceState>;
  npc: Record<string, NpcRelation>;
  pendingNukes: Record<string, PendingNuke>;
}
