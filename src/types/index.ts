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
  | 'wealthy'        // start with more money
  | 'highMorale'     // start with high morale, faster build
  | 'innovator'     // unlock better tech faster
  | 'diplomat'      // cheaper army items, better relations
  | 'industrial'    // produce goods faster
  | 'militaristic'; // start with stronger army

export interface ArmyState {
  infantry: number;
  tanks: number;
  fighters: number;
  bombers: number;
  ships: number;
  missiles: number;
}

export interface CapitalState {
  hp: number;       // damage points remaining, starts at 10000
  maxHp: number;
}

export interface DailyFlags {
  speechUsed: boolean;
  lastResetDay: number;
}

export interface PlayerState {
  uid: string;
  name: string;
  joinedAt: number;
  ready: boolean;
  countryCode: string | null;
  allianceId: string | null;
  perks: PerkId[];
  // Stats (0-100 unless noted)
  morale: number;
  reputation: number;
  money: number;       // in millions
  innovation: number;  // 0-100
  army: ArmyState;
  capital: CapitalState;
  // Held territories (country codes the player owns/controls)
  territories: string[];
  // Per-day flags (reset on day change)
  daily: DailyFlags;
}

export interface AllianceState {
  id: string;
  name: string;
  founderId: string;
  memberIds: string[];
}

export type AdvanceKind = 'military' | 'peace' | 'tourism';

// Pending diplomatic requests vs NPC nations
export interface NpcRelation {
  acceptance: number;   // 0-100; >=90 friendly, <=10 enemy
  lastAdvanceDay?: number;
}

export type SpeechKind = 'hate' | 'motivation' | 'solidarity';

export interface NewsItem {
  id: string;
  authorId: string;
  authorName: string;
  authorCountry: string | null;
  createdAt: number;
  day: number;
  kind: 'speech' | 'build' | 'attack' | 'advance' | 'alliance' | 'system';
  title: string;
  body: string;
  // For speech items: track who has already inspired
  inspiredBy?: string[];
  meta?: Record<string, string | number | boolean | null>;
}

export interface MoveItem {
  id: string;
  authorId: string;
  createdAt: number;
  day: number;
  kind: 'build' | 'attack' | 'missile' | 'advance' | 'transfer' | 'speech';
  payload: Record<string, unknown>;
}

export interface RoomState {
  id: string;
  adminId: string;
  createdAt: Timestamp | number;
  status: Phase;
  // Configurable preparation days (min 7)
  prepDays: number;
  // War always 7 days (configurable later)
  warDays: number;
  startedAt: Timestamp | number | null;
  // 24 hour day length in ms (default 86_400_000); exposed for future test mode
  dayLengthMs: number;
  players: Record<string, PlayerState>;
  alliances: Record<string, AllianceState>;
  // NPC + owned-country state keyed by ISO code
  npc: Record<string, NpcRelation>;
}
