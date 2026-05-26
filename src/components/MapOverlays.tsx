import { useEffect, useMemo } from 'react';
import { Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { RoomState } from '@/types';

// Iron Dome shields over active defenders' centroids.
export function IronDomeOverlay({ room }: { room: RoomState }) {
  const day = useCurrentDay(room);
  const domes = useMemo(() => {
    return Object.values(room.players)
      .filter((p) => p.countryCode && p.ironDome.activeUntilDay >= day && p.ironDome.activeUntilDay > 0)
      .map((p) => ({ uid: p.uid, center: COUNTRY_BY_CODE[p.countryCode!]?.center ?? null }))
      .filter((d) => d.center !== null);
  }, [room.players, day]);

  return (
    <>
      {domes.map((d) => (
        <Circle
          key={d.uid}
          center={d.center as [number, number]}
          radius={900_000}
          pathOptions={{
            color: '#60a5fa',
            weight: 1.5,
            fillColor: '#60a5fa',
            fillOpacity: 0.25,
            className: 'dome-pulse',
          }}
        />
      ))}
    </>
  );
}

function useCurrentDay(room: RoomState): number {
  return useMemo(() => {
    const s = room.startedAt;
    if (s == null) return 0;
    let ms: number;
    if (typeof s === 'number') ms = s;
    else {
      const t = s as { toMillis?: () => number; seconds?: number };
      if (typeof t.toMillis === 'function') ms = t.toMillis();
      else if (typeof t.seconds === 'number') ms = t.seconds * 1000;
      else return 0;
    }
    const elapsed = Math.max(0, Date.now() - ms);
    return Math.floor(elapsed / room.dayLengthMs) + 1;
  }, [room.startedAt, room.dayLengthMs]);
}

// Camp pins (yellow for yours, grey for others).
export function CampPins({ room, viewerUid }: { room: RoomState; viewerUid: string | null }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.layerGroup().addTo(map);
    Object.values(room.players).forEach((p) => {
      p.camps.forEach((c) => {
        const def = COUNTRY_BY_CODE[c.hostCountryCode];
        if (!def) return;
        const isMine = p.uid === viewerUid;
        const marker = L.circleMarker(def.center, {
          radius: 6,
          color: isMine ? '#fbbf24' : '#94a3b8',
          weight: 2,
          fillColor: isMine ? '#fbbf24' : '#475569',
          fillOpacity: 0.9,
        });
        marker.bindTooltip(
          `🏕️ Camp (${p.name}) · ${c.hp}/${c.maxHp} HP${c.hasAirstrip ? ' · ✈ Airstrip' : ''}`,
          { sticky: true }
        );
        marker.addTo(layer);
      });
    });
    return () => { layer.remove(); };
  }, [room.players, map, viewerUid]);
  return null;
}
