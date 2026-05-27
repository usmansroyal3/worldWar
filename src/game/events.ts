import { nanoid } from 'nanoid';
import { COUNTRIES, COUNTRY_BY_CODE } from '@/data/countries';
import type { WorldEvent } from '@/types';

// Random world events that hit NPC countries on a daily roll, shaking the
// strategic map. 35% chance per day (computed once by the first client to
// roll over).

export interface EventDef {
  kind: WorldEvent['kind'];
  emoji: string;
  title: (country: string) => string;
  body: (country: string) => string;
  // Optional: shifts the npc acceptance toward all players
  acceptanceShift?: number;
}

export const EVENTS: EventDef[] = [
  {
    kind: 'pandemic',
    emoji: '🦠',
    title: (c) => `Pandemic outbreak in ${c}`,
    body:  (c) => `${c} reports a viral outbreak. Borders tighten; trade slows.`,
    acceptanceShift: -8,
  },
  {
    kind: 'recession',
    emoji: '📉',
    title: (c) => `Recession hits ${c}`,
    body:  (c) => `Markets crash in ${c}. Foreign investment dries up.`,
    acceptanceShift: -5,
  },
  {
    kind: 'breakthrough',
    emoji: '💡',
    title: (c) => `Tech breakthrough in ${c}`,
    body:  (c) => `${c} announces a research breakthrough — diplomatic standing improves.`,
    acceptanceShift: +10,
  },
  {
    kind: 'unrest',
    emoji: '🪧',
    title: (c) => `Civil unrest in ${c}`,
    body:  (c) => `Mass protests in ${c}. Government struggles to maintain control.`,
    acceptanceShift: -12,
  },
  {
    kind: 'sanctions',
    emoji: '🚫',
    title: (c) => `Sanctions imposed on ${c}`,
    body:  (c) => `Major powers announce sanctions on ${c}. International standing falls.`,
    acceptanceShift: -15,
  },
];

export function rollDailyEvent(rng = Math.random): EventDef | null {
  if (rng() > 0.35) return null;
  return EVENTS[Math.floor(rng() * EVENTS.length)];
}

export function pickRandomNpc(playerCountryCodes: Set<string>, rng = Math.random): string | null {
  const candidates = COUNTRIES.filter((c) => !playerCountryCodes.has(c.code) && c.pop > 5);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)].code;
}

export function makeWorldEvent(def: EventDef, targetCode: string, day: number): WorldEvent {
  return {
    id: nanoid(8),
    day,
    kind: def.kind,
    targetCode,
    createdAt: Date.now(),
  };
}

export function eventDef(kind: WorldEvent['kind']): EventDef | undefined {
  return EVENTS.find((e) => e.kind === kind);
}

export function describeEvent(e: WorldEvent): { title: string; body: string; emoji: string } {
  const def = eventDef(e.kind);
  const country = COUNTRY_BY_CODE[e.targetCode]?.name ?? e.targetCode;
  if (!def) return { title: `Event in ${country}`, body: '', emoji: '🌐' };
  return {
    title: `${def.emoji} ${def.title(country)}`,
    body: def.body(country),
    emoji: def.emoji,
  };
}
