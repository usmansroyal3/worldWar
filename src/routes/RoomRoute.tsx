import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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

  // Auto-join when authenticated and not yet a player.
  useEffect(() => {
    if (!user || !room || !code) return;
    if (room.players[user.uid]) return;
    if (room.status !== 'lobby') return;
    joinRoom(code, user.uid, displayName).catch((e) => console.error(e));
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
    return <div className="min-h-screen flex items-center justify-center text-muted">Joining room...</div>;
  }

  if (room.status === 'lobby') {
    return <Lobby room={room} me={me} isAdmin={user.uid === room.adminId} />;
  }

  return <GameView room={room} me={me} />;
}
