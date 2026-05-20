import { onAuthStateChanged, signInAnonymously, updateProfile, type User } from 'firebase/auth';
import { auth } from './config';

export async function ensureAnonymousAuth(displayName?: string): Promise<User> {
  if (!auth) throw new Error('Firebase not configured. Fill in .env from .env.example.');
  const cred = await signInAnonymously(auth);
  if (displayName && cred.user && cred.user.displayName !== displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

export function watchAuth(cb: (user: User | null) => void): () => void {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function setDisplayName(name: string): Promise<void> {
  if (!auth?.currentUser) return;
  await updateProfile(auth.currentUser, { displayName: name });
}
