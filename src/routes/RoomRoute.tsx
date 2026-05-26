import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, Globe2, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { joinRoom } from '@/firebase/rooms';
import { Lobby } from '@/components/Lobby';
import { GameView } from '@/components/GameView';

export function RoomRoute() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, displayName, setDisplayName, loading: authLoading } = useAuth();
  const { room, loading, error } = useRoom(code ?? null);
  const joinAttempted = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  // Name confirmation gate: before auto-joining via share link, ask the new
  // player to confirm or change their display name. Players who are already
  // in room.players skip this entirely.
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    if (!user || !room || !code) return;
    if (room.players[user.uid]) {
      // Returning player — no name gate needed.
      setNameConfirmed(true);
      return;
    }
    if (room.status !== 'lobby') return;
    if (!nameConfirmed) return;
    if (joinAttempted.current) return;
    joinAttempted.current = true;
    setJoining(true);
    setJoinError(null);
    joinRoom(code, user.uid, displayName)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setJoinError(msg);
        joinAttempted.current = false;
      })
      .finally(() => setJoining(false));
  }, [user, room, code, displayName, nameConfirmed]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="panel p-6 max-w-sm text-center">
          <div className="text-bad font-semibold mb-2">Room not found</div>
          <div className="text-sm text-muted mb-4">{error ?? 'This room may have ended or never existed.'}</div>
          <button className="btn-primary" onClick={() => navigate('/')}>Back to home</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-muted">Signing in...</div>;
  }

  const me = room.players[user.uid];

  // Name-entry gate for new joiners (room exists, user signed in, but not yet
  // a player). Shown BEFORE we auto-join, so they can rename themselves first.
  if (!me && !nameConfirmed) {
    const playerCount = Object.keys(room.players).length;
    const full = playerCount >= 6;
    const started = room.status !== 'lobby';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg">
        <div className="panel p-5 max-w-sm w-full">
          <div className="flex items-center gap-2 mb-3 text-accent">
            <Globe2 className="w-5 h-5" />
            <span className="font-semibold">Joining room</span>
          </div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Room code</div>
          <div className="font-mono text-lg tracking-widest mb-4">{room.id}</div>

          {started ? (
            <div className="panel-2 p-3 mb-4 text-sm text-warn border-warn/40 border">
              This game has already started. You'll be a spectator only.
            </div>
          ) : full ? (
            <div className="panel-2 p-3 mb-4 text-sm text-bad border-bad/40 border">
              This room is full (6 players max).
            </div>
          ) : (
            <div className="panel-2 p-3 mb-4 text-sm text-muted">
              {playerCount} {playerCount === 1 ? 'player is' : 'players are'} waiting. Pick your name, then your country.
            </div>
          )}

          <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Your display name</label>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="input w-full mb-3"
            placeholder="Steel Lion"
            autoFocus
          />

          <button
            className="btn-primary w-full"
            disabled={full || started || !nameDraft.trim()}
            onClick={() => {
              const name = nameDraft.trim();
              if (!name) return;
              setDisplayName(name);
              setNameConfirmed(true);
            }}
          >
            Join as {nameDraft.trim() || '...'}
            <ChevronRight className="w-4 h-4" />
          </button>

          <button className="btn-secondary w-full mt-2" onClick={() => navigate('/')}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!me) {
    if (joinError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="panel p-6 max-w-md w-full">
            <div className="flex items-center gap-2 text-bad font-semibold mb-2">
              <AlertTriangle className="w-5 h-5" /> Could not join room
            </div>
            <pre className="text-xs text-muted whitespace-pre-wrap break-words mb-4 bg-panel2 p-3 rounded-lg">{joinError}</pre>
            <p className="text-sm text-muted mb-4">
              If you see "Missing or insufficient permissions", redeploy your Firestore rules:
              <br /><code className="text-ink">firebase deploy --only firestore:rules</code>
            </p>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => { setJoinError(null); }}>
                Try again
              </button>
              <button className="btn-secondary" onClick={() => navigate('/')}>Home</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        {joining ? 'Joining room...' : 'Preparing...'}
      </div>
    );
  }

  if (room.status === 'lobby') {
    return <Lobby room={room} me={me} isAdmin={user.uid === room.adminId} />;
  }

  return <GameView room={room} me={me} isAdmin={user.uid === room.adminId} />;
}
