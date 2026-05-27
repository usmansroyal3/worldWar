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

// Capital HP pins — every player-owned country gets a labeled HP badge at its
// centroid so everyone can see at a glance how much damage each side has
// left before elimination.
export function CapitalPins({ room, viewerUid }: { room: RoomState; viewerUid: string | null }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.layerGroup().addTo(map);
    Object.values(room.players).forEach((p) => {
      if (!p.countryCode) return;
      const def = COUNTRY_BY_CODE[p.countryCode];
      if (!def) return;
      const hp = Math.round(p.capital.hp);
      const maxHp = Math.round(p.capital.maxHp);
      const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
      const color = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444';
      const isMine = p.uid === viewerUid;
      const eliminated = hp <= 0;

      const html = `
        <div class="capital-pin ${isMine ? 'mine' : ''} ${eliminated ? 'eliminated' : ''}" style="--c:${color}">
          <div class="capital-pin-label">${eliminated ? '💀 DOWN' : `🏛️ ${hp} / ${maxHp}`}</div>
          <div class="capital-pin-bar"><div style="width:${hpPct}%"></div></div>
          <div class="capital-pin-name">${escapeHtml(p.name)}</div>
        </div>`;

      const icon = L.divIcon({
        html,
        className: 'capital-pin-wrap',
        iconSize: [130, 46],
        // anchor at top-middle so the badge hangs DOWN from the country centroid
        iconAnchor: [65, 0],
      });
      const marker = L.marker(def.center, { icon, interactive: true, zIndexOffset: 500 });
      marker.bindTooltip(
        `<b>${escapeHtml(p.name)}</b> · ${escapeHtml(def.name)}<br>Capital HP: ${hp} / ${maxHp} (${Math.round(hpPct)}%)<br>${eliminated ? '<span style="color:#ef4444">ELIMINATED</span>' : `${(maxHp - hp)} dmg taken · ${hp} to KO`}`,
        { sticky: true, direction: 'top' }
      );
      marker.addTo(layer);
    });
    return () => { layer.remove(); };
  }, [room.players, map, viewerUid]);
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
