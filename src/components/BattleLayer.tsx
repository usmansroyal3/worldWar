import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { NewsItem } from '@/types';

const TTL_MS = 16_000;

// Imperative battle-animation layer. Reads recent attack/nuke/intercept news
// and choreographs sprites over the map: curved missile arcs with glowing
// motion trails, plane formations that orbit the target, naval salvos,
// tank columns, tracer fire from defended targets, screen shake and a
// full-frame white flash on nuclear detonation.
//
// Markers are moved via requestAnimationFrame — no React re-renders in the
// hot path, so dozens of sprites stay smooth.
export function BattleLayer({ news }: { news: NewsItem[] }) {
  const map = useMap();
  const active = useRef<Map<string, () => void>>(new Map());
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = Date.now();
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

      // Frame the battle for everyone — only for fresh events, so replays
      // after a tab refocus don't yank the camera.
      if (age < 5000 && !seen.current.has(event.id)) {
        seen.current.add(event.id);
        try {
          const bounds = L.latLngBounds([from, to]).pad(0.5);
          map.flyToBounds(bounds, { duration: 1.2, maxZoom: 4, padding: [40, 40] });
        } catch { /* map not sized yet */ }
      }

      const cleanup = spawnBattle(map, event, from, to);
      active.current.set(event.id, cleanup);
      setTimeout(() => {
        const c = active.current.get(event.id);
        if (c) { c(); active.current.delete(event.id); }
      }, TTL_MS);
    });
  }, [news, map]);

  useEffect(() => {
    return () => {
      active.current.forEach((c) => c());
      active.current.clear();
    };
  }, []);

  return null;
}

// ============================================================================
// Geometry — curved flight paths
// ============================================================================

type LatLng = [number, number];

// Quadratic bezier with a lifted control point: missiles and aircraft fly a
// visible arc instead of sliding along a flat line.
function arcPos(a: LatLng, b: LatLng, t: number): LatLng {
  const dLat = b[0] - a[0];
  const dLng = b[1] - a[1];
  const dist = Math.hypot(dLat, dLng);
  const lift = Math.min(18, 4 + dist * 0.22);
  const c: LatLng = [(a[0] + b[0]) / 2 + lift, (a[1] + b[1]) / 2];
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
}

function arcPath(a: LatLng, b: LatLng, segments = 28): LatLng[] {
  return Array.from({ length: segments + 1 }, (_, i) => arcPos(a, b, i / segments));
}

function midArc(a: LatLng, b: LatLng): LatLng {
  return arcPos(a, b, 0.5);
}

// ============================================================================
// Screen-level effects
// ============================================================================

function shakeScreen(map: L.Map, big = false) {
  const el = map.getContainer();
  const cls = big ? 'shake-big' : 'shake';
  el.classList.remove('shake', 'shake-big');
  void el.offsetWidth; // restart animation
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), big ? 1900 : 500);
}

function nukeFlash(map: L.Map) {
  const el = map.getContainer();
  const flash = document.createElement('div');
  flash.className = 'nuke-flash';
  el.appendChild(flash);
  window.setTimeout(() => flash.remove(), 1400);
}

// ============================================================================
// Battle choreography
// ============================================================================

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

  // Drop a glowing dot behind a moving sprite; it fades out via CSS.
  const dropTrail = (pos: LatLng, color: string) => {
    const t = L.circleMarker(pos, {
      radius: 2.5, color, fillColor: color, fillOpacity: 0.85, weight: 0,
      className: 'trail-fade', interactive: false,
    });
    addMarker(t);
    after(750, () => t.remove());
  };

  // Fly a marker along the curved arc, dropping a motion trail.
  const flyArc = (
    marker: L.Marker, a: LatLng, b: LatLng, durationMs: number,
    trailColor: string | null, onDone?: () => void,
  ) => {
    const start = performance.now();
    let lastTrail = 0;
    const step = (now: number) => {
      if (killed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const pos = arcPos(a, b, ease(t));
      marker.setLatLng(pos);
      if (trailColor && now - lastTrail > 90) { lastTrail = now; dropTrail(pos, trailColor); }
      if (t < 1) rafIds.push(requestAnimationFrame(step));
      else if (onDone) onDone();
    };
    rafIds.push(requestAnimationFrame(step));
  };

  // Straight-line flight (ground columns, ships at sea level).
  const flyStraight = (
    marker: L.Marker, a: LatLng, b: LatLng, durationMs: number,
    trailColor: string | null, onDone?: () => void,
  ) => {
    const start = performance.now();
    let lastTrail = 0;
    const step = (now: number) => {
      if (killed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const e = ease(t);
      const pos: LatLng = [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e];
      marker.setLatLng(pos);
      if (trailColor && now - lastTrail > 140) { lastTrail = now; dropTrail(pos, trailColor); }
      if (t < 1) rafIds.push(requestAnimationFrame(step));
      else if (onDone) onDone();
    };
    rafIds.push(requestAnimationFrame(step));
  };

  const orbit = (
    marker: L.Marker, center: LatLng, radiusDeg: number, rotations: number,
    durationMs: number, onDone?: () => void,
  ) => {
    const start = performance.now();
    const p0 = marker.getLatLng();
    const startAngle = Math.atan2(p0.lat - center[0], p0.lng - center[1]);
    const step = (now: number) => {
      if (killed) return;
      const t = Math.min(1, (now - start) / durationMs);
      const angle = startAngle + 2 * Math.PI * rotations * t;
      marker.setLatLng([center[0] + radiusDeg * Math.sin(angle), center[1] + radiusDeg * Math.cos(angle)]);
      if (t < 1) rafIds.push(requestAnimationFrame(step));
      else if (onDone) onDone();
    };
    rafIds.push(requestAnimationFrame(step));
  };

  // Multi-stage explosion: flash ring + fireball + drifting smoke.
  const spawnBoom = (at: LatLng, big = false) => {
    const ring = L.circleMarker(at, {
      radius: big ? 16 : 9, color: '#fca5a5', fillColor: '#fecaca', fillOpacity: 0.5,
      weight: 2, className: 'impact-ring', interactive: false,
    });
    addMarker(ring);
    const boom = L.marker(at, { icon: makeIcon('💥', `boom-pop${big ? ' big' : ''}`, big ? 46 : 30), interactive: false, zIndexOffset: 850 });
    addMarker(boom);
    for (let i = 0; i < (big ? 3 : 2); i++) {
      after(250 + i * 200, () => {
        const dx = (Math.random() * 28 - 14).toFixed(0);
        const smoke = L.marker(at, {
          icon: L.divIcon({
            html: `<div class="battle-sprite smoke-drift" style="--dx:${dx}px">💨</div>`,
            className: 'battle-sprite-wrap', iconSize: [24, 24], iconAnchor: [12, 12],
          }),
          interactive: false, zIndexOffset: 820,
        });
        addMarker(smoke);
        after(2500, () => smoke.remove());
      });
    }
    after(1300, () => { ring.remove(); boom.remove(); });
  };

  // Anti-air tracer fire rising from a defended target toward the raiders.
  const spawnTracers = (target: LatLng, count: number) => {
    for (let i = 0; i < count; i++) {
      after(i * 550 + Math.random() * 250, () => {
        const dest: LatLng = [
          target[0] + (Math.random() * 8 - 4),
          target[1] + (Math.random() * 8 - 4),
        ];
        const t = L.marker(target, { icon: makeIcon('·', 'tracer-dot', 14), interactive: false, zIndexOffset: 760 });
        addMarker(t);
        flyStraight(t, target, dest, 600, '#fde047', () => t.remove());
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────
  const kind = event.kind;
  const meta = event.meta as Record<string, unknown>;
  const units = (meta?.units as Record<string, number> | undefined) ?? {};
  const primary = (meta?.primaryUnit as string | undefined) ?? 'missiles';
  const dmg = (meta?.dmg as number | undefined) ?? 0;
  const intercepted = !!meta?.intercepted;
  const defended = !!meta?.defended;

  // Curved route line: soft glow halo underneath, marching dashes on top.
  const routeColor = kind === 'nuke' ? '#fbbf24' : intercepted ? '#60a5fa' : '#ef4444';
  const path = arcPath(from, to);
  addMarker(L.polyline(path, { color: routeColor, weight: kind === 'nuke' ? 10 : 8, opacity: 0.3, interactive: false }));
  addMarker(L.polyline(path, { color: routeColor, weight: kind === 'nuke' ? 4.5 : 3, dashArray: '10 8', opacity: 1, className: 'attack-dash', interactive: false }));

  // ── Iron Dome intercept ──
  if (kind === 'intercept' || (kind === 'attack' && intercepted)) {
    const incoming = L.marker(from, { icon: makeIcon('🚀', 'rocket-spin glow-red', 32), interactive: false, zIndexOffset: 800 });
    addMarker(incoming);
    const mid = midArc(from, to);
    flyArc(incoming, from, mid, 1600, '#ef4444', () => {
      const interceptor = L.marker(to, { icon: makeIcon('🛡️', 'shield-rise', 38), interactive: false, zIndexOffset: 810 });
      addMarker(interceptor);
      flyArc(interceptor, to, mid, 700, '#60a5fa', () => {
        incoming.remove(); interceptor.remove();
        spawnBoom(mid, true);
        shakeScreen(map);
        spawnBadge(mid, '🛡️ INTERCEPTED', '#60a5fa');
      });
    });
    return cleanup;
  }

  // ── Nuclear strike ──
  if (kind === 'nuke') {
    const nuke = L.marker(from, { icon: makeIcon('☢️', 'rocket-spin glow-amber', 44), interactive: false, zIndexOffset: 900 });
    addMarker(nuke);
    flyArc(nuke, from, to, 4500, '#fbbf24', () => {
      nuke.remove();
      nukeFlash(map);
      shakeScreen(map, true);
      const shock1 = L.circleMarker(to, { radius: 8, color: '#fbbf24', fillColor: '#fef3c7', fillOpacity: 0.9, weight: 3, interactive: false, className: 'impact-ring nuke-ring' });
      const shock2 = L.circleMarker(to, { radius: 8, color: '#f97316', fillColor: '#fed7aa', fillOpacity: 0.6, weight: 3, interactive: false, className: 'impact-ring nuke-ring-2' });
      const cloud = L.marker(to, { icon: makeIcon('☁️', 'nuke-cloud', 80), interactive: false, zIndexOffset: 950 });
      addMarker(shock1); addMarker(shock2); addMarker(cloud);
      spawnBoom(to, true);
      spawnBadge(to, `☢️ ${dmg.toLocaleString()} dmg`, '#fbbf24', 6000);
    });
    return cleanup;
  }

  // ── Air raid: formation flies in, orbits the target, bombs fall ──
  if (['fighters', 'rafales', 'stealth', 'bombers'].includes(primary)) {
    const planeEmoji =
      primary === 'stealth' ? '🦇' :
      primary === 'rafales' ? '🛫' :
      primary === 'bombers' ? '🛩️' : '✈️';
    const totalCount = sumValues(units, ['fighters', 'rafales', 'stealth', 'bombers']);
    const visualCount = Math.min(7, Math.max(2, Math.round(Math.sqrt(totalCount))));

    let shaken = false;
    for (let i = 0; i < visualCount; i++) {
      const offset = (i - visualCount / 2) * 0.6;
      const startPos: LatLng = [from[0] + offset * 0.3, from[1] + offset];
      const plane = L.marker(startPos, { icon: makeIcon(planeEmoji, 'plane-bob', 30), interactive: false, zIndexOffset: 700 + i });
      addMarker(plane);
      after(i * 160, () => {
        flyArc(plane, startPos, to, 2800 + i * 100, i % 2 === 0 ? '#93c5fd' : null, () => {
          orbit(plane, to, 4 + i * 0.4, 2, 4200, () => {
            spawnBoom(to);
            if (!shaken) { shaken = true; shakeScreen(map); }
            const cur = plane.getLatLng();
            flyArc(plane, [cur.lat, cur.lng], startPos, 2400, null);
          });
        });
      });
      for (let b = 0; b < 3; b++) {
        after(3000 + b * 950 + i * 160, () => spawnBoom(to));
      }
    }
    if (defended) spawnTracers(to, 8);
    after(3400, () => spawnBadge(to, `💥 ${dmg.toLocaleString()} dmg`, '#ef4444'));
    return cleanup;
  }

  // ── Naval / Submarine: cruise offshore, launch a salvo ──
  if (primary === 'ships' || primary === 'subs') {
    const offshore: LatLng = [
      to[0] + (from[0] - to[0]) * 0.25,
      to[1] + (from[1] - to[1]) * 0.25,
    ];
    const isSub = primary === 'subs';
    const ship = L.marker(from, { icon: makeIcon(isSub ? '⚓' : '🚢', isSub ? 'sub-stealth' : 'ship-cruise', 32), interactive: false });
    addMarker(ship);
    flyStraight(ship, from, offshore, 3500, isSub ? null : '#94a3b8', () => {
      for (let i = 0; i < 3; i++) {
        after(i * 380, () => {
          const m = L.marker(offshore, { icon: makeIcon('🚀', 'rocket-spin glow-red', 28), interactive: false });
          addMarker(m);
          flyArc(m, offshore, to, 1500, '#f87171', () => {
            m.remove();
            spawnBoom(to);
          });
        });
      }
      after(3 * 380 + 1600, () => {
        shakeScreen(map);
        spawnBadge(to, `💥 ${dmg.toLocaleString()} dmg`, '#ef4444');
      });
    });
    return cleanup;
  }

  // ── Ground assault: staggered armored column ──
  if (primary === 'infantry' || primary === 'tanks') {
    const visualCount = primary === 'tanks' ? 4 : 5;
    const emoji = primary === 'tanks' ? '🛡️' : '🪖';
    for (let i = 0; i < visualCount; i++) {
      const offset = (i - visualCount / 2) * 0.5;
      const startPos: LatLng = [from[0] + offset * 0.3, from[1] + offset];
      const endPos: LatLng = [to[0] + offset * 0.3, to[1] + offset];
      const m = L.marker(startPos, { icon: makeIcon(emoji, 'ground-march', 28), interactive: false });
      addMarker(m);
      after(i * 220, () => flyStraight(m, startPos, endPos, 7000, '#a8a29e'));
    }
    after(7100, () => {
      spawnBoom(to, true);
      shakeScreen(map);
      spawnBadge(to, `🪖 ${dmg.toLocaleString()} dmg`, '#ef4444');
    });
    return cleanup;
  }

  // ── Missile barrage (default) ──
  {
    const visualCount = Math.min(5, Math.max(1, (units.missiles as number) ?? 1));
    let shaken = false;
    for (let i = 0; i < visualCount; i++) {
      after(i * 240, () => {
        const m = L.marker(from, { icon: makeIcon('🚀', 'rocket-spin glow-red', 30), interactive: false });
        addMarker(m);
        flyArc(m, from, to, 1900, '#f87171', () => {
          m.remove();
          spawnBoom(to);
          if (!shaken) { shaken = true; shakeScreen(map); }
        });
      });
    }
    after(visualCount * 240 + 2000, () => spawnBadge(to, `💥 ${dmg.toLocaleString()} dmg`, '#ef4444'));
    return cleanup;
  }

  // ─── local helpers needing closure state ───
  function spawnBadge(at: LatLng, text: string, color: string, lifeMs = 7000) {
    const badge = L.marker(at, {
      icon: L.divIcon({
        html: `<div class="battle-badge" style="color:${color};border-color:${color}">${text}</div>`,
        className: 'battle-sprite-wrap',
        iconSize: [130, 30],
        iconAnchor: [65, 52],
      }),
      interactive: false,
      zIndexOffset: 1000,
    });
    addMarker(badge);
    after(lifeMs, () => badge.remove());
  }
}

// ─── Icon factory ────────────────────────────────────────────────────

function makeIcon(emoji: string, cls: string, size = 36): L.DivIcon {
  return L.divIcon({
    html: `<div class="battle-sprite ${cls}">${emoji}</div>`,
    className: 'battle-sprite-wrap',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function sumValues(obj: Record<string, number>, keys: string[]): number {
  return keys.reduce((acc, k) => acc + (obj[k] ?? 0), 0);
}
