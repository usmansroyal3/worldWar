import { useEffect, useRef, useState } from 'react';
import { patchPlayer } from '@/firebase/rooms';
import { splitQueue } from '@/game/build';
import { tsToMs } from '@/game/timer';
import { sfx } from '@/lib/sound';
import type { ArmyState, PlayerState, RoomState } from '@/types';

// Watches the player's build queue against game-elapsed time and delivers
// finished orders into the army. Returns the current elapsed ms so the Build
// tab can render live countdowns from the same clock.
export function useBuildQueue(room: RoomState, me: PlayerState): number {
  const [elapsedMs, setElapsedMs] = useState(0);
  const inFlight = useRef(false);

  useEffect(() => {
    const start = tsToMs(room.startedAt);
    if (start == null) return;
    const tick = () => setElapsedMs(Math.max(0, Date.now() - start));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [room.startedAt]);

  useEffect(() => {
    const queue = me.buildQueue ?? [];
    if (queue.length === 0 || elapsedMs <= 0 || inFlight.current) return;
    const { done, pending } = splitQueue(queue, elapsedMs);
    if (done.length === 0) return;

    const nextArmy: ArmyState = { ...me.army };
    done.forEach((o) => { nextArmy[o.unitKey] += o.qty; });

    inFlight.current = true;
    patchPlayer(room.id, me.uid, { army: nextArmy, buildQueue: pending })
      .then(() => sfx.build())
      .catch((e) => console.error('build delivery failed', e))
      .finally(() => { inFlight.current = false; });
  }, [elapsedMs, me, room.id]);

  return elapsedMs;
}
