import { useEffect, useMemo, useState } from 'react';
import { Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { NewsItem, RoomState } from '@/types';

const ATTACK_TTL_MS = 12_000; // animations play for ~12 seconds after the event

// Iron Dome shields: animated translucent circles over the capitals of
// players whose dome is currently active. Render inside a MapContainer.
export function IronDomeOverlay({ room }: { room: RoomState }) {
  // Read current day from the rendered clock; we don't have a hook here so use
  // a quick computation. Components driving this overlay pass the room snapshot
  // and we just check activeUntilDay vs now-day via startedAt.
  const day = useCurrentDay(room);

  const domes = useMemo(() => {
    return Object.values(room.players)
      .filter((p) => p.countryCode && p.ironDome.activeUntilDay >= day && p.ironDome.activeUntilDay > 0)
      .map((p) => ({
        uid: p.uid,
        center: COUNTRY_BY_CODE[p.countryCode!]?.center ?? null,
      }))
      .filter((d) => d.center !== null);
  }, [room.players, day]);

  return (
    <>
      {domes.map((d) => (
        <Circle
          key={d.uid}
          center={d.center as [number, number]}
          radius={900_000}
          pathOptions={{ color: '#60a5fa', weight: 1.5, fillColor: '#60a5fa', fillOpacity: 0.25, className: 'dome-pulse' }}
        />
      ))}
    </>
  );
}

// Attack route polylines: draw the most recent attack events on the map.
// Each line is an arc from attacker capital to target country with a
// CSS-animated dash pattern. After ATTACK_TTL_MS, lines fade out.
export function AttackRoutes({ news }: { news: NewsItem[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const recent = useMemo(() => {
    return news.filter((n) => {
      if (n.kind !== 'attack' && n.kind !== 'nuke') return false;
      const age = now - n.createdAt;
      if (age > ATTACK_TTL_MS) return false;
      const from = n.meta?.routeFrom as string | undefined;
      const to = n.meta?.routeTo as string | undefined;
      if (!from || !to) return false;
      return COUNTRY_BY_CODE[from] && COUNTRY_BY_CODE[to];
    });
  }, [news, now]);

  return (
    <>
      {recent.map((n) => {
        const from = COUNTRY_BY_CODE[n.meta!.routeFrom as string].center;
        const to = COUNTRY_BY_CODE[n.meta!.routeTo as string].center;
        const isNuke = n.kind === 'nuke';
        return (
          <Polyline
            key={n.id}
            positions={[from, to]}
            pathOptions={{
              color: isNuke ? '#fbbf24' : '#ef4444',
              weight: isNuke ? 4 : 2.5,
              dashArray: '10 8',
              opacity: 0.95,
              className: 'attack-dash',
            }}
          />
        );
      })}
    </>
  );
}

// Read the day from room without re-importing the timer logic; lightweight
// because we only need an integer. Falls back to 1 if startedAt is null.
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

// Pin markers for the player's army camps. Tooltip shows HP and garrison.
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
