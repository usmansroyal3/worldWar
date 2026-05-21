import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { COUNTRIES_BY_NAME, COUNTRY_BY_CODE } from '@/data/countries';
import { WorldMap } from './WorldMap';
import type { RoomState } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  currentCode: string | null;
  onPick: (code: string) => void;
}

export function CountryPicker({ open, onClose, room, currentCode, onPick }: Props) {
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState<string | null>(currentCode);

  // Codes already claimed by other players are not pickable.
  const takenSet = useMemo(() => {
    const s = new Set<string>();
    Object.values(room.players).forEach((p) => {
      if (p.countryCode && p.uid !== currentCode) s.add(p.countryCode);
    });
    return s;
  }, [room.players, currentCode]);

  const pickable = useMemo(() => {
    const all = new Set(COUNTRIES_BY_NAME.map((c) => c.code));
    Object.values(room.players).forEach((p) => {
      if (p.countryCode) all.delete(p.countryCode);
    });
    if (currentCode) all.add(currentCode);
    return all;
  }, [room.players, currentCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return COUNTRIES_BY_NAME.filter((c) =>
      !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q
    );
  }, [search]);

  if (!open) return null;

  const selected = hovered ? COUNTRY_BY_CODE[hovered] : null;

  return (
    <div className="fixed inset-0 z-[1000] bg-bg flex flex-col">
      <header className="flex items-center justify-between p-3 border-b border-border bg-panel">
        <h2 className="font-semibold">Pick your country</h2>
        <button className="p-2 rounded-lg hover:bg-panel2" onClick={onClose}><X className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 grid grid-rows-[1fr_auto] md:grid-cols-[1fr_320px] md:grid-rows-1 overflow-hidden">
        <div className="relative">
          <WorldMap
            room={room}
            viewerCountryCode={currentCode}
            selectedCode={hovered}
            onCountryClick={(code) => {
              if (pickable.has(code)) setHovered(code);
            }}
            highlightMode="pickable"
            pickableSet={pickable}
          />
          {takenSet.size > 0 && (
            <div className="absolute top-2 left-2 panel-2 px-3 py-1.5 text-xs text-muted">
              <span className="text-bad">●</span> {takenSet.size} countries taken
            </div>
          )}
        </div>

        <aside className="md:border-l border-t md:border-t-0 border-border bg-panel flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search 195 countries..."
                className="input w-full pl-8"
              />
            </div>
          </div>

          {selected && (
            <div className="p-3 border-b border-border bg-panel2">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold">{selected.name}</div>
                  <div className="text-xs text-muted">{selected.region}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted">Population</div>
                  <div className="font-mono text-accent">{selected.pop.toLocaleString()}M</div>
                </div>
              </div>
              {selected.blocs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selected.blocs.map((b) => (
                    <span key={b} className="chip bg-panel border border-border text-muted">{b}</span>
                  ))}
                </div>
              )}
              <button
                className="btn-primary w-full mt-3"
                disabled={!pickable.has(selected.code)}
                onClick={() => onPick(selected.code)}
              >
                {currentCode === selected.code ? 'Already selected' : pickable.has(selected.code) ? `Choose ${selected.name}` : 'Country taken'}
              </button>
            </div>
          )}

          <ul className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.map((c) => {
              const taken = !pickable.has(c.code);
              return (
                <li key={c.code}>
                  <button
                    className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-panel2 ${
                      hovered === c.code ? 'bg-panel2' : ''
                    } ${taken ? 'opacity-50' : ''}`}
                    onClick={() => setHovered(c.code)}
                  >
                    <span>
                      <span className="font-mono text-xs text-muted mr-2">{c.code}</span>
                      {c.name}
                    </span>
                    <span className="text-xs text-muted">{c.pop}M</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}
