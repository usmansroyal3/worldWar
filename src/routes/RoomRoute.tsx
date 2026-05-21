import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { joinRoom } from '@/firebase/rooms';
import { Lobby } from '@/components/Lobby';
import { GameView } from '@/components/GameView';

export function RoomRoute() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, displayName, loading: authLoading } = useAuth();
  const { room, loading, error } = useRoom(code ?? null);
  const joinAttempted = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user || !room || !code) return;
    if (room.players[user.uid]) return;
    if (room.status !== 'lobby') return;
    if (joinAttempted.current) return;
    joinAttempted.current = true;
    setJoining(true);
    setJoinError(null);
    joinRoom(code, user.uid, displayName)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setJoinError(msg);
        // Allow manual retry once the user dismisses the error.
        joinAttempted.current = false;
      })
      .finally(() => setJoining(false));
  }, [user, room, code, displayName]);

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

  return <GameView room={room} me={me} />;
}
