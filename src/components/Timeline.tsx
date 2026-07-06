import { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import type { NewsItem, RoomState } from '@/types';

interface Props { room: RoomState; news: NewsItem[]; currentDay: number }

const KIND_LABEL: Record<string, string> = {
  speech: '📣 Speech', build: '🔨 Build', attack: '⚔️ Attack', nuke: '☢️ Nuke',
  intercept: '🛡️ Intercept', alliance: '🤝 Alliance', advance: '✈️ Diplomacy',
  camp: '🏕️ Camp', system: '⚙️ System', event: '🌐 World', capture: '🏴 Capture',
  declaration: '📜 Declaration', digest: '🗓️ Digest',
};

export function Timeline({ news, currentDay }: Props) {
  const days = Array.from({ length: currentDay }, (_, i) => i + 1).reverse();
  const [filterDay, setFilterDay] = useState<number | 'all'>('all');
  const filtered = useMemo(() => {
    if (filterDay === 'all') return news;
    return news.filter((n) => n.day === filterDay);
  }, [news, filterDay]);

  return (
    <div className="panel p-3">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-accent" />
        <h3 className="font-semibold">Timeline</h3>
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin mb-3 pb-1">
        <button
          onClick={() => setFilterDay('all')}
          className={`px-2 py-1 rounded text-xs whitespace-nowrap ${filterDay === 'all' ? 'bg-accent text-white' : 'bg-panel2 text-muted'}`}
        >All</button>
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setFilterDay(d)}
            className={`px-2 py-1 rounded text-xs whitespace-nowrap ${filterDay === d ? 'bg-accent text-white' : 'bg-panel2 text-muted'}`}
          >Day {d}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center text-xs text-muted py-4">Nothing happened this day.</div>
      ) : (
        <ul className="space-y-1">
          {filtered.map((n) => (
            <li key={n.id} className="panel-2 p-2 text-xs">
              <div className="flex items-baseline justify-between">
                <span><span className="text-muted">{KIND_LABEL[n.kind] ?? n.kind}</span></span>
                <span className="text-muted">Day {n.day}</span>
              </div>
              <div className="font-medium mt-0.5">{n.title}</div>
              {n.body && <div className="text-muted mt-0.5">{n.body}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
