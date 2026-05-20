import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { ensureAnonymousAuth, watchAuth, setDisplayName as setDName } from '@/firebase/auth';
import { firebaseConfigured } from '@/firebase/config';

const NAME_KEY = 'ww:displayName';

function generateName(): string {
  const adj = ['Steel', 'Red', 'Iron', 'Crimson', 'Silver', 'Shadow', 'Eagle', 'Phantom', 'Storm', 'Granite'];
  const noun = ['Lion', 'Falcon', 'Bear', 'Hawk', 'Wolf', 'Tiger', 'Cobra', 'Dragon', 'Ronin', 'Spear'];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>(() => {
    return localStorage.getItem(NAME_KEY) ?? generateName();
  });

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }
    localStorage.setItem(NAME_KEY, displayName);
    const unsub = watchAuth(async (u) => {
      if (!u) {
        try {
          await ensureAnonymousAuth(displayName);
        } catch (err) {
          console.error('Anonymous auth failed', err);
          setLoading(false);
        }
        return;
      }
      if (u.displayName !== displayName) {
        try { await setDName(displayName); } catch { /* ignore */ }
      }
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, [displayName]);

  return {
    user,
    loading,
    displayName,
    setDisplayName: (name: string) => {
      const v = name.trim() || generateName();
      localStorage.setItem(NAME_KEY, v);
      setDisplayName(v);
    },
  };
}
