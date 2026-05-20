import type { Perk, PerkId } from '@/types';

export const PERKS: Record<PerkId, Perk> = {
  wealthy: {
    id: 'wealthy',
    name: 'Resource Rich',
    description: '+50% starting treasury. Build heavy units without bleeding cash.',
    emoji: '💰',
  },
  highMorale: {
    id: 'highMorale',
    name: 'Unbreakable Spirit',
    description: 'Start at 85 morale. People believe in you — production runs faster.',
    emoji: '🔥',
  },
  innovator: {
    id: 'innovator',
    name: 'Tech Pioneer',
    description: 'Unlock advanced weapons and defenses earlier in the prep phase.',
    emoji: '🧪',
  },
  diplomat: {
    id: 'diplomat',
    name: 'Master Diplomat',
    description: 'Cheaper arms imports from friendly nations. Better acceptance from neutrals.',
    emoji: '🕊️',
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial Base',
    description: 'Factories output tanks, planes, and ships +25% faster.',
    emoji: '🏭',
  },
  militaristic: {
    id: 'militaristic',
    name: 'Standing Army',
    description: 'Start with a pre-built force — infantry, tanks, and a small fleet.',
    emoji: '⚔️',
  },
};

export const ALL_PERK_IDS: PerkId[] = Object.keys(PERKS) as PerkId[];

// Each player gets a random subset of 2 perks at game start.
export function rollPerks(seed: number, count = 2): PerkId[] {
  const pool = [...ALL_PERK_IDS];
  const out: PerkId[] = [];
  // mulberry32 PRNG for deterministic-but-varied rolls
  let s = seed >>> 0;
  const rand = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  while (out.length < count && pool.length) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
