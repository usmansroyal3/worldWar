import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { db } from './config';
import type { AllianceState, NewsItem, PlayerState, RoomState } from '@/types';
import { emptyArmy, startingArmy, startingInnovation, startingMoneyForCountry, startingMorale } from '@/game/army';
import { rollPerks } from '@/data/perks';
import { COUNTRY_BY_CODE } from '@/data/countries';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function genRoomCode(): string {
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

function requireDb() {
  if (!db) throw new Error('Firebase not configured. Set VITE_FIREBASE_* env vars.');
  return db;
}

export function blankPlayer(uid: string, name: string): PlayerState {
  const perks = rollPerks(hashSeed(uid), 2);
  return {
    uid,
    name,
    joinedAt: Date.now(),
    ready: false,
    countryCode: null,
    allianceId: null,
    perks,
    morale: startingMorale(perks),
    reputation: 50,
    // Money is finalised on game start once the country is locked in — until
    // then we give a base placeholder so the lobby UI shows something sane.
    money: 1000,
    innovation: startingInnovation(perks),
    army: { ...emptyArmy(), ...startingArmy(perks) },
    capital: { hp: 100, maxHp: 100 },
    territories: [],
    daily: { speechUsed: false, lastResetDay: 0 },
    camps: [],
    ironDome: { activeUntilDay: 0, interceptsToday: 0 },
    fatigueToday: 0,
    totals: { damageDealt: 0, damageTaken: 0, nukesLaunched: 0, spentOnBuilds: 0, intelOps: 0, speechesGiven: 0 },
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function createRoom(uid: string, displayName: string, prepDays = 7): Promise<string> {
  const db = requireDb();
  const code = genRoomCode();
  const ref = doc(db, 'rooms', code);
  const room: RoomState = {
    id: code,
    adminId: uid,
    createdAt: Date.now(),
    status: 'lobby',
    prepDays: Math.max(7, Math.floor(prepDays)),
    warDays: 7,
    startedAt: null,
    dayLengthMs: 24 * 60 * 60 * 1000,
    players: { [uid]: blankPlayer(uid, displayName) },
    alliances: {},
    npc: {},
    pendingNukes: {},
    diplomacy: {},
    events: [],
    history: [],
    lastEventDay: 0,
  };
  await setDoc(ref, { ...room, createdAt: serverTimestamp() });
  return code;
}

export async function joinRoom(code: string, uid: string, displayName: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Room ${code} not found.`);
  const room = snap.data() as RoomState;
  if (room.status !== 'lobby') throw new Error('Game already started.');
  const playerCount = Object.keys(room.players).length;
  if (room.players[uid]) return; // already in
  if (playerCount >= 6) throw new Error('Room is full (6 players max).');
  await updateDoc(ref, { [`players.${uid}`]: blankPlayer(uid, displayName) });
}

export function watchRoom(code: string, cb: (room: RoomState | null) => void): Unsubscribe {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) return cb(null);
    cb(snap.data() as RoomState);
  });
}

export async function patchPlayer(code: string, uid: string, patch: Partial<PlayerState>): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const updates: Record<string, unknown> = {};
  Object.entries(patch).forEach(([k, v]) => {
    updates[`players.${uid}.${k}`] = v;
  });
  await updateDoc(ref, updates);
}

export async function updateRoom(code: string, patch: Partial<RoomState>): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await updateDoc(ref, patch as Record<string, unknown>);
}

export async function startGame(code: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room missing');
  const room = snap.data() as RoomState;

  // Seed each player's nuclear arsenal from their chosen country's real-world count.
  const updates: Record<string, unknown> = {
    status: 'preparation',
    startedAt: serverTimestamp(),
  };
  Object.values(room.players).forEach((p) => {
    if (!p.countryCode) return;
    const n = COUNTRY_BY_CODE[p.countryCode]?.nukes ?? 0;
    updates[`players.${p.uid}.army.nukes`] = n;
    // Seed treasury from chosen country's real-world defense budget
    updates[`players.${p.uid}.money`] = startingMoneyForCountry(p.countryCode, p.perks);
  });
  await updateDoc(ref, updates);
}

// Admin-only TEST helper: shift startedAt backwards by one day so all clients
// roll into the next day immediately. Remove before public release.
export async function fastForwardOneDay(code: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomState;
  const start = room.startedAt;
  if (!start) return;
  let ms: number;
  if (typeof start === 'number') ms = start;
  else {
    const anyT = start as { toMillis?: () => number; seconds?: number };
    if (typeof anyT.toMillis === 'function') ms = anyT.toMillis();
    else if (typeof anyT.seconds === 'number') ms = anyT.seconds * 1000;
    else return;
  }
  await updateDoc(ref, { startedAt: ms - room.dayLengthMs });
}

export async function createAlliance(code: string, founderId: string, name: string): Promise<string> {
  const id = nanoid(6);
  const a: AllianceState = { id, name, founderId, memberIds: [founderId] };
  await updateRoom(code, { [`alliances.${id}`]: a } as unknown as Partial<RoomState>);
  await patchPlayer(code, founderId, { allianceId: id });
  return id;
}

export async function joinAlliance(code: string, allianceId: string, uid: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Room missing');
  const room = snap.data() as RoomState;
  const a = room.alliances[allianceId];
  if (!a) throw new Error('Alliance missing');
  if (a.memberIds.includes(uid)) return;
  const next = { ...a, memberIds: [...a.memberIds, uid] };
  await updateDoc(ref, {
    [`alliances.${allianceId}`]: next,
    [`players.${uid}.allianceId`]: allianceId,
  });
}

export async function leaveAlliance(code: string, allianceId: string, uid: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomState;
  const a = room.alliances[allianceId];
  if (!a) return;
  const remaining = a.memberIds.filter((m) => m !== uid);
  const updates: Record<string, unknown> = {
    [`players.${uid}.allianceId`]: null,
  };
  if (remaining.length === 0) {
    updates[`alliances.${allianceId}`] = null;
  } else {
    updates[`alliances.${allianceId}`] = { ...a, memberIds: remaining };
  }
  await updateDoc(ref, updates);
}

// ---- News feed --------------------------------------------------------------

export async function postNews(code: string, item: Omit<NewsItem, 'id' | 'createdAt'>): Promise<string> {
  const db = requireDb();
  const col = collection(db, 'rooms', code.toUpperCase(), 'news');
  const ref = await addDoc(col, { ...item, createdAt: Date.now() });
  return ref.id;
}

export function watchNews(code: string, cb: (items: NewsItem[]) => void): Unsubscribe {
  const db = requireDb();
  const col = collection(db, 'rooms', code.toUpperCase(), 'news');
  const q = query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: NewsItem[] = [];
    snap.forEach((d) => items.push({ id: d.id, ...(d.data() as Omit<NewsItem, 'id'>) }));
    cb(items);
  });
}

export async function inspireNews(code: string, newsId: string, readerUid: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase(), 'news', newsId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const item = snap.data() as NewsItem;
  if (item.inspiredBy?.includes(readerUid)) return;
  await updateDoc(ref, {
    inspiredBy: [...(item.inspiredBy ?? []), readerUid],
  });
}

// ---- Pending nuclear proposals ---------------------------------------------

import type { PendingNuke } from '@/types';

export async function proposeNuke(code: string, proposal: PendingNuke): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await updateDoc(ref, { [`pendingNukes.${proposal.id}`]: proposal });
}

export async function approveNuke(code: string, proposalId: string, uid: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomState;
  const p = room.pendingNukes?.[proposalId];
  if (!p) return;
  if (p.approvedBy.includes(uid)) return;
  await updateDoc(ref, {
    [`pendingNukes.${proposalId}.approvedBy`]: [...p.approvedBy, uid],
  });
}

export async function cancelNuke(code: string, proposalId: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await updateDoc(ref, { [`pendingNukes.${proposalId}`]: null });
}

// ---- Diplomacy (war / ceasefire declarations) ------------------------------

import type { DiplomaticState, DiplomaticStatus, WorldEvent, DaySnapshot } from '@/types';
import { pairKey } from '@/game/diplomacy2';

export async function declareDiplomacy(
  code: string,
  by: string,
  other: string,
  status: DiplomaticStatus
): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const state: DiplomaticState = { status, declaredAt: Date.now(), declaredBy: by };
  await updateDoc(ref, { [`diplomacy.${pairKey(by, other)}`]: state });
}

// ---- World events + history snapshot ---------------------------------------

export async function appendEvent(code: string, event: WorldEvent): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomState;
  // Don't let the event log grow unbounded — cap to last 60.
  const next = [...(room.events ?? []), event].slice(-60);
  await updateDoc(ref, { events: next, lastEventDay: event.day });
}

export async function appendHistory(code: string, snapshot: DaySnapshot): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomState;
  const existing = room.history ?? [];
  if (existing.some((h) => h.day === snapshot.day)) return; // idempotent
  const next = [...existing, snapshot].sort((a, b) => a.day - b.day);
  await updateDoc(ref, { history: next });
}

// ---- Territory capture ------------------------------------------------------

// Move a country from the source player's `territories` (or `countryCode`)
// to the attacker's `territories`. NPC capture: just adds to attacker.
export async function captureTerritory(
  code: string,
  attackerUid: string,
  targetCode: string,
  formerOwnerUid: string | null,
): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data() as RoomState;
  const attacker = room.players[attackerUid];
  if (!attacker || attacker.countryCode === targetCode) return;
  if (attacker.territories.includes(targetCode)) return;
  const updates: Record<string, unknown> = {
    [`players.${attackerUid}.territories`]: [...attacker.territories, targetCode],
  };
  if (formerOwnerUid && room.players[formerOwnerUid]) {
    const former = room.players[formerOwnerUid];
    if (former.countryCode === targetCode) {
      updates[`players.${formerOwnerUid}.countryCode`] = null;
    } else {
      updates[`players.${formerOwnerUid}.territories`] = former.territories.filter((t) => t !== targetCode);
    }
  }
  await updateDoc(ref, updates);
}

// ---- Room status transition (end game) -------------------------------------

export async function endRoom(code: string): Promise<void> {
  const db = requireDb();
  const ref = doc(db, 'rooms', code.toUpperCase());
  await updateDoc(ref, { status: 'ended' });
}

