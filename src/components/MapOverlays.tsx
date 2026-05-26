import { Fragment, useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { NewsItem, RoomState } from '@/types';

const ATTACK_TTL_MS = 14_000;

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

// Live attack visualisation: route polyline + launcher pulse + impact badge.
// Drives off recent news items (kind 'attack' or 'nuke') with routeFrom/routeTo
// in meta. Each event renders for ~14 seconds then disappears.
export function AttackRoutes({ news }: { news: NewsItem[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  const recent = useMemo(() => {
    return news.filter((n) => {
      if (n.kind !== 'attack' && n.kind !== 'nuke' && n.kind !== 'intercept') return false;
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
        const isIntercept = n.kind === 'intercept';
        const lineColor = isNuke ? '#fbbf24' : isIntercept ? '#60a5fa' : '#ef4444';
        const dmg = (n.meta?.dmg as number | undefined) ?? 0;

        return (
          <Fragment key={n.id}>
            {/* Route arc */}
            <Polyline
              positions={[from, to]}
              pathOptions={{
                color: lineColor,
                weight: isNuke ? 5 : 3,
                dashArray: '10 8',
                opacity: 0.95,
                className: 'attack-dash',
              }}
            />
            {/* Launch glow at source */}
            <CircleMarker
              center={from}
              radius={9}
              pathOptions={{
                color: lineColor,
                fillColor: lineColor,
                fillOpacity: 0.6,
                weight: 2,
                className: 'launch-pulse',
              }}
            />
            {/* Impact rings at target */}
            <CircleMarker
              center={to}
              radius={14}
              pathOptions={{
                color: lineColor,
                fillColor: lineColor,
                fillOpacity: 0.15,
                weight: 2,
                className: 'impact-ring',
              }}
            />
            <CircleMarker
              center={to}
              radius={8}
              pathOptions={{
                color: lineColor,
                fillColor: lineColor,
                fillOpacity: 0.9,
                weight: 1,
              }}
            >
              {/* Damage label that pops up over the target */}
              <Tooltip permanent direction="top" offset={[0, -8]} className="impact-pop">
                {isIntercept
                  ? '🛡️ Intercepted'
                  : isNuke
                  ? `☢️ ${dmg.toLocaleString()} dmg`
                  : `💥 ${dmg.toLocaleString()} dmg`}
              </Tooltip>
            </CircleMarker>
          </Fragment>
        );
      })}
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
