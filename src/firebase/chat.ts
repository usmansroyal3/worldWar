import {
  addDoc, collection, onSnapshot, orderBy, query, where, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';

export interface ChatMessage {
  id: string;
  allianceId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: number;
}

function requireDb() {
  if (!db) throw new Error('Firebase not configured.');
  return db;
}

export async function sendChat(
  roomCode: string,
  allianceId: string,
  authorId: string,
  authorName: string,
  body: string,
): Promise<void> {
  const text = body.trim();
  if (!text) return;
  const col = collection(requireDb(), 'rooms', roomCode.toUpperCase(), 'alliance-chat');
  await addDoc(col, { allianceId, authorId, authorName, body: text.slice(0, 500), createdAt: Date.now() });
}

export function watchChat(
  roomCode: string,
  allianceId: string,
  cb: (msgs: ChatMessage[]) => void,
): Unsubscribe {
  const col = collection(requireDb(), 'rooms', roomCode.toUpperCase(), 'alliance-chat');
  const q = query(col, where('allianceId', '==', allianceId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const out: ChatMessage[] = [];
    snap.forEach((d) => out.push({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) }));
    cb(out);
  });
}
