import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, Users, Plus, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createRoom, joinRoom } from '@/firebase/rooms';
import { firebaseConfigured } from '@/firebase/config';

export function Landing() {
  const { user, displayName, setDisplayName, loading } = useAuth();
  const navigate = useNavigate();
  const [prepDays, setPrepDays] = useState(7);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!user) return;
    setBusy('create');
    setError(null);
    try {
      const code = await createRoom(user.uid, displayName, prepDays);
      navigate(`/room/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin() {
    if (!user || !joinCode) return;
    setBusy('join');
    setError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      await joinRoom(code, user.uid, displayName);
      navigate(`/room/${code}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 border border-accent/40 mb-3">
            <Globe2 className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">World War</h1>
          <p className="text-muted text-sm mt-1">Real-time multiplayer geopolitical strategy</p>
        </div>

        {!firebaseConfigured && (
          <div className="panel-2 p-4 mb-4 border-warn/40 border">
            <p className="text-sm text-warn font-semibold mb-1">Firebase not configured</p>
            <p className="text-xs text-muted">
              Copy <code>.env.example</code> to <code>.env</code> and fill in your Firebase web app config
              from the Firebase console.
            </p>
          </div>
        )}

        <div className="panel p-5 mb-4">
          <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Your display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input w-full"
            placeholder="Steel Lion"
          />
        </div>

        <div className="panel p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Plus className="w-4 h-4 text-accent" />
            <h2 className="font-semibold">Create a new game</h2>
          </div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
            Preparation days <span className="text-ink font-mono">{prepDays}</span>
          </label>
          <input
            type="range"
            min={7}
            max={21}
            value={prepDays}
            onChange={(e) => setPrepDays(Number(e.target.value))}
            className="w-full accent-accent mb-4"
          />
          <div className="text-xs text-muted mb-3">
            War phase always lasts 7 days. Total game length: {prepDays + 7} days.
          </div>
          <button
            className="btn-primary w-full"
            onClick={handleCreate}
            disabled={!user || busy !== null || loading}
          >
            {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Room
          </button>
        </div>

        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <LogIn className="w-4 h-4 text-accent" />
            <h2 className="font-semibold">Join an existing room</h2>
          </div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="input w-full mb-3 font-mono tracking-widest text-center text-lg"
            placeholder="ABCDE"
            maxLength={5}
          />
          <button
            className="btn-secondary w-full"
            onClick={handleJoin}
            disabled={!user || joinCode.length < 4 || busy !== null}
          >
            {busy === 'join' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Join Room
          </button>
        </div>

        {error && (
          <div className="panel-2 p-3 mt-4 border-bad/50 border text-bad text-sm">{error}</div>
        )}

        <div className="text-center mt-8 text-xs text-muted">
          Add to home screen to play as a full app. Up to 6 players per room.
        </div>
      </div>
    </div>
  );
}
