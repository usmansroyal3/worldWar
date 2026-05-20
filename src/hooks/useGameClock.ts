import { useEffect, useState } from 'react';
import { computeGameClock, type GameClock } from '@/game/timer';
import type { RoomState } from '@/types';

// Re-evaluates every second so countdown and day boundary refresh in near real time.
export function useGameClock(room: RoomState | null): GameClock | null {
  const [clock, setClock] = useState<GameClock | null>(() => (room ? computeGameClock(room, Date.now()) : null));

  useEffect(() => {
    if (!room || !room.startedAt) {
      setClock(null);
      return;
    }
    const tick = () => setClock(computeGameClock(room, Date.now()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [room]);

  return clock;
}
