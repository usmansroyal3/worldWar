import type { PlayerState, SpeechKind } from '@/types';

export interface SpeechEffect {
  morale: number;
  reputation: number;
  title: string;
  body: string;
}

export const SPEECH_OPTIONS: Record<SpeechKind, { label: string; emoji: string; description: string }> = {
  hate: {
    label: 'Hateful Speech',
    emoji: '🔥',
    description: 'Whip up the base. +5 reputation domestically. Other nations notice.',
  },
  motivation: {
    label: 'Motivation Speech',
    emoji: '💪',
    description: 'Rally the people. +5 morale. Production runs faster tomorrow.',
  },
  solidarity: {
    label: 'Solidarity Speech',
    emoji: '🤝',
    description: 'A measured tone. +2 morale, +2 reputation.',
  },
};

export function applySpeech(player: PlayerState, kind: SpeechKind): SpeechEffect {
  const e: SpeechEffect = { morale: 0, reputation: 0, title: '', body: '' };
  switch (kind) {
    case 'hate':
      e.reputation = 5;
      e.title = `${player.name} declares hostility`;
      e.body = `A fiery address from ${countryLabel(player)} rallies hardliners.`;
      break;
    case 'motivation':
      e.morale = 5;
      e.title = `${player.name} rallies the nation`;
      e.body = `Crowds gather in ${countryLabel(player)} as morale surges.`;
      break;
    case 'solidarity':
      e.morale = 2;
      e.reputation = 2;
      e.title = `${player.name} calls for unity`;
      e.body = `${countryLabel(player)} appeals to common ground — at home and abroad.`;
      break;
  }
  return e;
}

function countryLabel(p: PlayerState): string {
  return p.countryCode ?? 'their nation';
}

// Inspire mechanic: another country reads the news post and is moved by it.
// Inspirer gains +1 morale; the original author gains +2 reputation.
export const INSPIRE_BONUS = {
  reader_morale: 1,
  author_reputation: 2,
};
