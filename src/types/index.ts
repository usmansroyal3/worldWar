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
  // War-fatigue accumulator: damage dealt today drives morale loss at day tick.
  fatigueToday: number;
  // Tracks total stats for MVP awards in the end-game screen.
  totals: {
    damageDealt: number;
    damageTaken: number;
    nukesLaunched: number;
    spentOnBuilds: number;
    intelOps: number;
    speechesGiven: number;
  };
  eliminated?: boolean;
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
  | 'camp'
  | 'event'        // random world event
  | 'capture'      // territory capture
  | 'declaration'  // war declared / ended
  | 'digest';      // per-day digest

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
  meta?: Record<string, unknown>;
}

export interface MoveItem {
  id: string;
  authorId: string;
  createdAt: number;
  day: number;
  kind: 'build' | 'attack' | 'missile' | 'advance' | 'transfer' | 'speech' | 'nuke';
  payload: Record<string, unknown>;
}

export interface PendingNuke {
  id: string;
  proposerId: string;
  proposerCountry: string;
  targetCode: string;
  targetPlayerId: string | null;
  approvedBy: string[];
  createdAt: number;
  day: number;
}

// Diplomatic state tracked between two players. Key is `${a}__${b}` with
// the two UIDs sorted alphabetically so it's deterministic regardless of
// which side calls the API.
export type DiplomaticStatus = 'peace' | 'war' | 'ceasefire';
export interface DiplomaticState {
  status: DiplomaticStatus;
  declaredAt: number;
  declaredBy: string;
}

// Random world event hitting an NPC country.
export interface WorldEvent {
  id: string;
  day: number;
  kind: 'pandemic' | 'recession' | 'breakthrough' | 'unrest' | 'sanctions';
  targetCode: string;
  createdAt: number;
}

// Snapshot of standings at the end of each day — drives the end-game graph.
export interface DaySnapshot {
  day: number;
  totals: Record<string, { popScore: number; capitalHp: number; money: number }>;
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
  // New systems
  diplomacy: Record<string, DiplomaticState>;
  events: WorldEvent[];
  history: DaySnapshot[];
  lastEventDay: number;
}
