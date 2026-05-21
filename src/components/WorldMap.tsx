import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet';
import L, { type GeoJSON as LGeoJSON, type LeafletMouseEvent, type PathOptions } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { RELATIONSHIP_COLOR, getRelationship } from '@/game/relationships';
import type { Relationship, RoomState } from '@/types';

// Natural Earth admin-0 countries, simplified 1:110m. Served via JSDelivr.
const GEO_URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson';

interface Props {
  room: RoomState | null;
  viewerCountryCode: string | null;
  selectedCode?: string | null;
  onCountryClick?: (code: string) => void;
  highlightMode?: 'relationship' | 'plain' | 'pickable';
  pickableSet?: Set<string> | null;
  // Optional react-leaflet children rendered above the country polygons —
  // typically <IronDomeOverlay/>, <AttackRoutes/>, <CampPins/>.
  overlays?: React.ReactNode;
}

// Natural Earth uses ISO_A2 / ISO_A3. We map them to our internal codes.
function featureCode(feature: Feature): string | null {
  const props = feature.properties as Record<string, unknown> | null;
  if (!props) return null;
  // Some entries have ISO_A2 = '-99'; fall back to other fields.
  const candidates = [
    props.ISO_A2,
    props.ISO_A2_EH,
    props.WB_A2,
    props.POSTAL,
  ].filter((v): v is string => typeof v === 'string' && v.length === 2 && v !== '-9');
  for (const c of candidates) {
    if (COUNTRY_BY_CODE[c.toUpperCase()]) return c.toUpperCase();
  }
  // Manual fallbacks for ones that have weird codes in Natural Earth
  const name = (props.NAME_EN ?? props.NAME ?? props.ADMIN) as string | undefined;
  if (!name) return null;
  const byName: Record<string, string> = {
    'France': 'FR',
    'Norway': 'NO',
    'Kosovo': '__skip__',
    'N. Cyprus': '__skip__',
    'Somaliland': '__skip__',
    'Taiwan': '__skip__',
    'Western Sahara': '__skip__',
    'Palestine': 'PS',
    'Vatican': 'VA',
  };
  const mapped = byName[name];
  if (mapped && mapped !== '__skip__') return mapped;
  return null;
}

export function WorldMap({ room, viewerCountryCode, selectedCode, onCountryClick, highlightMode = 'relationship', pickableSet, overlays }: Props) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((d: FeatureCollection) => { if (!aborted) setGeo(d); })
      .catch((err) => console.error('geojson load failed', err));
    return () => { aborted = true; };
  }, []);

  const styleFn = useMemo(() => {
    return (feature?: Feature<Geometry>): PathOptions => {
      const code = feature ? featureCode(feature) : null;
      if (!code) {
        return { fillColor: '#1e293b', color: '#0b1220', weight: 0.5, fillOpacity: 0.3 };
      }
      const isSelected = selectedCode === code;
      const isHover = hover === code;
      let fill = '#1e293b';
      let stroke = '#334155';
      if (highlightMode === 'pickable' && pickableSet) {
        fill = pickableSet.has(code) ? '#172447' : '#0f172a';
      } else if (highlightMode === 'relationship' && room && viewerCountryCode) {
        const rel: Relationship = getRelationship(room, viewerCountryCode, code);
        fill = RELATIONSHIP_COLOR[rel];
      } else if (highlightMode === 'plain') {
        fill = '#172447';
      }
      if (isSelected) { stroke = '#fbbf24'; }
      else if (isHover) { stroke = '#93c5fd'; }
      return {
        fillColor: fill,
        color: stroke,
        weight: isSelected ? 2 : isHover ? 1.5 : 0.5,
        fillOpacity: highlightMode === 'pickable' && pickableSet && !pickableSet.has(code) ? 0.3 : 0.7,
      };
    };
  }, [room, viewerCountryCode, selectedCode, hover, highlightMode, pickableSet]);

  const onEach = (feature: Feature, layer: L.Layer) => {
    const code = featureCode(feature);
    if (!code) return;
    const def = COUNTRY_BY_CODE[code];
    if (!def) return;

    const pathLayer = layer as L.Path;
    pathLayer.bindTooltip(`${def.name} · ${def.pop.toLocaleString()}M`, { sticky: true, direction: 'top' });
    pathLayer.on({
      mouseover: () => setHover(code),
      mouseout: () => setHover((h) => (h === code ? null : h)),
      click: (e: LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        if (onCountryClick) onCountryClick(code);
      },
    });
  };

  return (
    <MapContainer
      center={[20, 10]}
      zoom={2}
      minZoom={2}
      maxZoom={6}
      worldCopyJump
      preferCanvas
      zoomControl
      attributionControl
      className="w-full h-full"
      style={{ background: '#0b1220' }}
    >
      <FitWorld />
      {geo && (
        <GeoJSON
          key={`${selectedCode ?? 'n'}-${hover ?? 'n'}-${viewerCountryCode ?? 'n'}-${highlightMode}-${pickableSet ? pickableSet.size : 0}`}
          data={geo}
          style={styleFn as (f?: Feature) => PathOptions}
          onEachFeature={onEach}
        />
      )}
      {overlays}
      <NoTiles />
    </MapContainer>
  );
}

// Disable raster tiles for a clean polygon-only view.
function NoTiles() {
  return <TileLayer url="" attribution="Natural Earth · ne_110m_admin_0_countries" eventHandlers={{}} />;
}

function FitWorld() {
  const map = useMap();
  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    map.fitBounds([[-60, -170], [80, 180]]);
  }, [map]);
  return null;
}
