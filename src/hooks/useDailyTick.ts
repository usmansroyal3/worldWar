import { useEffect, useRef } from 'react';
import { patchPlayer } from '@/firebase/rooms';
import { dailyTickPatch } from '@/game/tick';
import type { PlayerState, RoomState } from '@/types';

// Whenever the game day advances past me.daily.lastResetDay, push the
// daily-tick patch (reputation→morale uplift, perk yields, dome upkeep,
// speech reset) to Firestore. The lastResetDay guard makes the write
// idempotent — repeating clients won't double-apply because the snapshot
// updates the local me, then subsequent runs of this effect see lastResetDay
// already at currentDay and skip.
export function useDailyTick(roomId: string, me: PlayerState, currentDay: number | null) {
  const inFlight = useRef(false);

  useEffect(() => {
    if (currentDay == null || currentDay < 1) return;
    if (inFlight.current) return;
    if (me.daily.lastResetDay >= currentDay) return;

    const patch = dailyTickPatch(me, currentDay);
    if (!patch) return;

    inFlight.current = true;
    patchPlayer(roomId, me.uid, patch)
      .catch((e) => console.error('daily tick failed', e))
      .finally(() => { inFlight.current = false; });
  }, [roomId, me, currentDay]);
}
