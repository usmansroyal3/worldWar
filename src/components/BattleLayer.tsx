import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { NewsItem } from '@/types';

const TTL_MS = 16_000;

// Imperative animation layer rendered into the Leaflet map. Reads recent
// attack/nuke/intercept news events and spawns animated sprite columns,
// missile arcs, dogfighting formations, and explosions on top of the map.
//
// Why imperative? React-leaflet's declarative wrappers can't update marker
// positions every frame without massive re-render cost. Direct Leaflet
// markers with requestAnimationFrame interpolation keep ~60fps with many
// sprites in flight at once.
export function BattleLayer({ news }: { news: NewsItem[] }) {
  const map = useMap();
  const active = useRef<Map<string, () => void>>(new Map());
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = Date.now();

    // Spawn animations for events that are recent and not yet animating
    news.forEach((event) => {
      const age = now - event.createdAt;
      if (age < 0 || age > TTL_MS) return;
      if (!event.meta) return;
      const fromCode = event.meta.routeFrom as string | undefined;
      const toCode = event.meta.routeTo as string | undefined;
      if (!fromCode || !toCode) return;
      const from = COUNTRY_BY_CODE[fromCode]?.center;
      const to = COUNTRY_BY_CODE[toCode]?.center;
      if (!from || !to) return;
      if (active.current.has(event.id)) return;

      // Auto-pan the map to frame this battle. flyToBounds smoothly animates
      // pan + zoom so even an inattentive player can't miss the action.
      // We only fly for events that are very fresh (<5s) — replays of older
      // news after a tab refocus shouldn't yank the camera around.
      if (age < 5000 && !seen.current.has(event.id)) {
        seen.current.add(event.id);
        try {
          const bounds = L.latLngBounds([from, to]).pad(0.5);
          map.flyToBounds(bounds, { duration: 1.2, maxZoom: 4, padding: [40, 40] });
        } catch { /* ignore — flyToBounds can throw if the map isn't sized yet */ }
      }

      const cleanup = spawnBattle(map, event, from, to);
      active.current.set(event.id, cleanup);

      setTimeout(() => {
        const c = active.current.get(event.id);
        if (c) { c(); active.current.delete(event.id); }
      }, TTL_MS);
    });
  }, [news, map]);

  // Final unmount cleanup
  useEffect(() => {
    return () => {
      active.current.forEach((c) => c());
      active.current.clear();
    };
  }, []);

  return null;
}

// ============================================================================
// Sprite & animation primitives
// ============================================================================

type LatLng = [number, number];

function spawnBattle(
  map: L.Map,
  event: NewsItem,
  from: LatLng,
  to: LatLng,
): () => void {
  const markers: L.Layer[] = [];
  const timeouts: number[] = [];
  const rafIds: number[] = [];
  let killed = false;

  const cleanup = () => {
    if (killed) return;
    killed = true;
    timeouts.forEach((id) => clearTimeout(id));
    rafIds.forEach((id) => cancelAnimationFrame(id));
    markers.forEach((m) => m.remove());
  };

  const addMarker = (m: L.Layer) => { if (!killed) { markers.push(m); m.addTo(map); } };
  const after = (ms: number, fn: () => void) => {
    if (killed) return;
    const id = window.setTimeout(() => { if (!killed) fn(); }, ms);
    timeouts.push(id);
  };
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  const flyAlong = (
    marker: L.Marker,
    a: LatLng,
    b: LatLng,
    durationMs: number,
    onDone?: () => void,
  ) => {
    const start = performance.now();
    const step = (now: number) => {
      if (killed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const e = ease(t);
      marker.setLatLng([a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]);
      if (t < 1) {
        const id = requestAnimationFrame(step);
        rafIds.push(id);
      } else if (onDone) {
        onDone();
      }
    };
    const id = requestAnimationFrame(step);
    rafIds.push(id);
  };

  const orbit = (
    marker: L.Marker,
    center: LatLng,
    radiusDeg: number,
    rotations: number,
    durationMs: number,
    onDone?: () => void,
  ) => {
    const start = performance.now();
    const startPos = marker.getLatLng();
    const startAngle = Math.atan2(startPos.lat - center[0], startPos.lng - center[1]);
    const step = (now: number) => {
      if (killed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const angle = startAngle + 2 * Math.PI * rotations * t;
      const lat = center[0] + radiusDeg * Math.sin(angle);
      const lng = center[1] + radiusDeg * Math.cos(angle);
      marker.setLatLng([lat, lng]);
      if (t < 1) { rafIds.push(requestAnimationFrame(step)); }
      else if (onDone) { onDone(); }
    };
    rafIds.push(requestAnimationFrame(step));
  };

  // ──────────────────────────────────────────────────────────────────
  // Pick choreography based on event kind / primary unit
  // ──────────────────────────────────────────────────────────────────

  const kind = event.kind;
  const meta = event.meta as Record<string, unknown>;
  const units = (meta?.units as Record<string, number> | undefined) ?? {};
  const primary = (meta?.primaryUnit as string | undefined) ?? 'missiles';
  const dmg = (meta?.dmg as number | undefined) ?? 0;
  const intercepted = !!meta?.intercepted;

  // Route line (always present, gives spatial context). We draw a glow halo
  // underneath and the actual dashed line on top for visibility on dark map.
  const routeColor = kind === 'nuke' ? '#fbbf24' : intercepted ? '#60a5fa' : '#ef4444';
  const halo = L.polyline([from, to], {
    color: routeColor,
    weight: kind === 'nuke' ? 10 : 8,
    opacity: 0.35,
    interactive: false,
  });
  const route = L.polyline([from, to], {
    color: routeColor,
    weight: kind === 'nuke' ? 5 : 3.5,
    dashArray: '10 8',
    opacity: 1,
    className: 'attack-dash',
    interactive: false,
  });
  addMarker(halo);
  addMarker(route);

  // ── Intercepted (missile that's stopped mid-flight) ──
  if (kind === 'intercept' || (kind === 'attack' && intercepted)) {
    const incoming = L.marker(from, { icon: makeIcon('🚀', 'rocket-spin glow-red', 32), interactive: false, zIndexOffset: 800 });
    addMarker(incoming);
    flyAlong(incoming, from, midpoint(from, to), 1500, () => {
      const intRise = L.marker(to, { icon: makeIcon('🛡️', 'shield-rise', 38), interactive: false, zIndexOffset: 800 });
      addMarker(intRise);
      flyAlong(intRise, to, midpoint(from, to), 700, () => {
        const flash = L.marker(midpoint(from, to), { icon: makeIcon('💥', 'boom-pop big', 52), interactive: false, zIndexOffset: 900 });
        addMarker(flash);
        spawnImpactBadge(map, midpoint(from, to), '🛡️ INTERCEPTED', '#60a5fa', addMarker, after);
        after(1500, () => { incoming.remove(); intRise.remove(); });
      });
    });
    return cleanup;
  }

  // ── Nuclear strike ──
  if (kind === 'nuke') {
    const nuke = L.marker(from, { icon: makeIcon('☢️', 'rocket-spin glow-amber', 44), interactive: false, zIndexOffset: 900 });
    addMarker(nuke);
    flyAlong(nuke, from, to, 4500, () => {
      nuke.remove();
      // Massive expanding shockwave + mushroom
      const shock1 = L.circleMarker(to, { radius: 8, color: '#fbbf24', fillColor: '#fef3c7', fillOpacity: 0.9, weight: 3, interactive: false, className: 'impact-ring nuke-ring' });
      const shock2 = L.circleMarker(to, { radius: 8, color: '#f97316', fillColor: '#fed7aa', fillOpacity: 0.6, weight: 3, interactive: false, className: 'impact-ring nuke-ring-2' });
      const cloud = L.marker(to, { icon: makeIcon('☁️', 'nuke-cloud', 80), interactive: false, zIndexOffset: 950 });
      addMarker(shock1); addMarker(shock2); addMarker(cloud);
      spawnImpactBadge(map, to, `☢️ ${dmg.toLocaleString()} dmg`, '#fbbf24', addMarker, after, 5000);
    });
    return cleanup;
  }

  // ── Air raid (fighters / rafales / stealth / bombers) ──
  if (['fighters', 'rafales', 'stealth', 'bombers'].includes(primary)) {
    const planeEmoji =
      primary === 'stealth' ? '🦇' :
      primary === 'rafales' ? '🛫' :
      primary === 'bombers' ? '🛩️' : '✈️';
    const totalCount = sumValues(units, ['fighters', 'rafales', 'stealth', 'bombers']);
    const visualCount = Math.min(7, Math.max(2, Math.round(Math.sqrt(totalCount))));

    for (let i = 0; i < visualCount; i++) {
      const offset = (i - visualCount / 2) * 0.6;
      const startPos: LatLng = [from[0] + offset * 0.3, from[1] + offset];
      const targetOrbit: LatLng = to;
      const planeIcon = makeIcon(planeEmoji, 'plane-bob', 30);
      const plane = L.marker(startPos, { icon: planeIcon, interactive: false, zIndexOffset: 700 + i });
      addMarker(plane);
      after(i * 150, () => {
        flyAlong(plane, startPos, targetOrbit, 2800 + i * 100, () => {
          orbit(plane, targetOrbit, 4 + i * 0.4, 2, 4200, () => {
            // Drop a small explosion on departure
            spawnSmallBoom(map, targetOrbit, addMarker, after);
            // Plane flies back home
            const cur = plane.getLatLng();
            flyAlong(plane, [cur.lat, cur.lng], startPos, 2400);
          });
        });
      });
      // Periodic mini-booms while orbiting (1-2 per plane per second)
      for (let b = 0; b < 4; b++) {
        after(2800 + b * 900 + i * 150, () => spawnSmallBoom(map, targetOrbit, addMarker, after));
      }
    }
    // Big damage badge at impact site
    after(3200, () => spawnImpactBadge(map, to, `💥 ${dmg.toLocaleString()} dmg`, '#ef4444', addMarker, after));
    return cleanup;
  }

  // ── Naval / Submarine ──
  if (primary === 'ships' || primary === 'subs') {
    const offshore: LatLng = [
      to[0] + (from[0] - to[0]) * 0.25,
      to[1] + (from[1] - to[1]) * 0.25,
    ];
    const isSub = primary === 'subs';
    const shipIcon = makeIcon(isSub ? '⚓' : '🚢', isSub ? 'sub-stealth' : 'ship-cruise', 32);
    const ship = L.marker(from, { icon: shipIcon, interactive: false });
    addMarker(ship);
    flyAlong(ship, from, offshore, 3500, () => {
      // Launch a salvo of missiles
      const salvo = 3;
      for (let i = 0; i < salvo; i++) {
        after(i * 350, () => {
          const m = L.marker(offshore, { icon: makeIcon('🚀', 'rocket-spin glow-red', 28), interactive: false });
          addMarker(m);
          flyAlong(m, offshore, to, 1500, () => {
            m.remove();
            spawnSmallBoom(map, to, addMarker, after);
          });
        });
      }
      after(salvo * 350 + 1700, () => spawnImpactBadge(map, to, `💥 ${dmg.toLocaleString()} dmg`, '#ef4444', addMarker, after));
    });
    return cleanup;
  }

  // ── Ground assault (infantry / tanks) ──
  if (primary === 'infantry' || primary === 'tanks') {
    const visualCount = primary === 'tanks' ? 4 : 5;
    const emoji = primary === 'tanks' ? '🛡️' : '🪖';
    for (let i = 0; i < visualCount; i++) {
      const offset = (i - visualCount / 2) * 0.5;
      const startPos: LatLng = [from[0] + offset * 0.3, from[1] + offset];
      const endPos: LatLng = [to[0] + offset * 0.3, to[1] + offset];
      const m = L.marker(startPos, { icon: makeIcon(emoji, 'ground-march', 28), interactive: false });
      addMarker(m);
      after(i * 200, () => flyAlong(m, startPos, endPos, 7000));
    }
    after(7000, () => {
      spawnSmallBoom(map, to, addMarker, after);
      spawnImpactBadge(map, to, `🪖 ${dmg.toLocaleString()} dmg`, '#ef4444', addMarker, after);
    });
    return cleanup;
  }

  // ── Default / missile barrage ──
  {
    const visualCount = Math.min(5, Math.max(1, (units.missiles as number) ?? 1));
    for (let i = 0; i < visualCount; i++) {
      after(i * 220, () => {
        const m = L.marker(from, { icon: makeIcon('🚀', 'rocket-spin glow-red', 30), interactive: false });
        addMarker(m);
        flyAlong(m, from, to, 1800, () => {
          m.remove();
          spawnSmallBoom(map, to, addMarker, after);
        });
      });
    }
    after(visualCount * 220 + 1800, () => spawnImpactBadge(map, to, `💥 ${dmg.toLocaleString()} dmg`, '#ef4444', addMarker, after));
    return cleanup;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function midpoint(a: LatLng, b: LatLng): LatLng {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function sumValues(obj: Record<string, number>, keys: string[]): number {
  return keys.reduce((acc, k) => acc + (obj[k] ?? 0), 0);
}

function makeIcon(emoji: string, cls: string, size = 36): L.DivIcon {
  return L.divIcon({
    html: `<div class="battle-sprite ${cls}">${emoji}</div>`,
    className: 'battle-sprite-wrap',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function spawnSmallBoom(
  map: L.Map,
  at: LatLng,
  addMarker: (m: L.Layer) => void,
  after: (ms: number, fn: () => void) => void,
) {
  const boom = L.marker(at, { icon: makeIcon('💥', 'boom-pop', 28), interactive: false, zIndexOffset: 800 });
  addMarker(boom);
  after(1200, () => boom.remove());
}

function spawnImpactBadge(
  map: L.Map,
  at: LatLng,
  text: string,
  color: string,
  addMarker: (m: L.Layer) => void,
  after: (ms: number, fn: () => void) => void,
  lifeMs = 7000,
) {
  const badge = L.marker(at, {
    icon: L.divIcon({
      html: `<div class="battle-badge" style="color:${color};border-color:${color}">${text}</div>`,
      className: 'battle-sprite-wrap',
      iconSize: [120, 28],
      iconAnchor: [60, 50],
    }),
    interactive: false,
    zIndexOffset: 1000,
  });
  addMarker(badge);
  after(lifeMs, () => badge.remove());
}
