import { useEffect, useRef } from 'react';
import { patchPlayer, appendEvent, appendHistory, postNews, updateRoom } from '@/firebase/rooms';
import { dailyTickPatch } from '@/game/tick';
import { rollDailyEvent, pickRandomNpc, makeWorldEvent, eventDef } from '@/game/events';
import { computeStandings } from '@/game/scoring';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { sfx } from '@/lib/sound';
import type { DaySnapshot, PlayerState, RoomState } from '@/types';

// Per-player daily tick — applies fatigue, income, dome upkeep, speech reset.
// Plus admin-side: world events, day digest, history snapshot. Only admin
// runs the room-wide writes to avoid stampedes.
export function useDailyTick(
  roomId: string,
  me: PlayerState,
  room: RoomState | null,
  currentDay: number | null,
  isAdmin: boolean,
) {
  const inFlight = useRef(false);
  const lastRoomDay = useRef(0);

  useEffect(() => {
    if (currentDay == null || currentDay < 1) return;
    if (inFlight.current) return;
    if (me.daily.lastResetDay >= currentDay) return;

    const patch = dailyTickPatch(me, currentDay);
    if (!patch) return;

    inFlight.current = true;
    patchPlayer(roomId, me.uid, patch)
      .then(() => sfx.daytick())
      .catch((e) => console.error('daily tick failed', e))
      .finally(() => { inFlight.current = false; });
  }, [roomId, me, currentDay]);

  // Admin-side: roll world event + snapshot once per day boundary.
  useEffect(() => {
    if (!room || !isAdmin) return;
    if (currentDay == null || currentDay < 1) return;
    if (lastRoomDay.current >= currentDay) return;
    if ((room.lastEventDay ?? 0) >= currentDay) return;
    lastRoomDay.current = currentDay;

    (async () => {
      try {
        // World event roll
        const ev = rollDailyEvent();
        if (ev) {
          const playerCodes = new Set<string>();
          Object.values(room.players).forEach((p) => { if (p.countryCode) playerCodes.add(p.countryCode); });
          const target = pickRandomNpc(playerCodes);
          if (target) {
            const def = eventDef(ev.kind)!;
            const country = COUNTRY_BY_CODE[target]?.name ?? target;
            const event = makeWorldEvent(def, target, currentDay);
            await appendEvent(roomId, event);

            // Shift NPC acceptance
            if (def.acceptanceShift) {
              const cur = room.npc[target]?.acceptance ?? 50;
              const next = Math.max(0, Math.min(100, cur + def.acceptanceShift));
              await updateRoom(roomId, { [`npc.${target}.acceptance`]: next } as unknown as Partial<RoomState>);
            }
            await postNews(roomId, {
              authorId: 'system',
              authorName: 'World News',
              authorCountry: null,
              day: currentDay,
              kind: 'event',
              title: `${def.emoji} ${def.title(country)}`,
              body: def.body(country),
              meta: { targetCode: target, eventKind: ev.kind },
            });
          } else {
            // still mark this day rolled
            await updateRoom(roomId, { lastEventDay: currentDay } as unknown as Partial<RoomState>);
          }
        } else {
          await updateRoom(roomId, { lastEventDay: currentDay } as unknown as Partial<RoomState>);
        }

        // Daily history snapshot for the end-game graph
        const standings = computeStandings(room);
        const snap: DaySnapshot = {
          day: currentDay - 1,
          totals: Object.fromEntries(
            Object.values(room.players).map((p) => [
              p.uid,
              { popScore: 0, capitalHp: p.capital.hp, money: p.money },
            ])
          ),
        };
        standings.forEach((s) => {
          s.members.forEach((uid) => {
            if (snap.totals[uid]) snap.totals[uid].popScore = s.popScore;
          });
        });
        await appendHistory(roomId, snap);
      } catch (e) {
        console.error('admin daily tick failed', e);
      }
    })();
  }, [room, currentDay, isAdmin, roomId]);
}
