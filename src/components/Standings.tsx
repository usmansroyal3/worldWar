import { Trophy, Shield } from 'lucide-react';
import { computeStandings } from '@/game/scoring';
import type { RoomState } from '@/types';

export function Standings({ room }: { room: RoomState }) {
  const standings = computeStandings(room);
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-warn" />
        <h3 className="font-semibold">Standings (population points)</h3>
      </div>
      <ul className="space-y-2">
        {standings.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 panel-2 p-2">
            <span className="w-6 text-center font-mono text-sm text-muted">#{i + 1}</span>
            {s.kind === 'alliance' ? <Shield className="w-4 h-4 text-accent" /> : null}
            <span className="flex-1 font-medium">{s.name}</span>
            <span className="font-mono text-warn">{s.popScore.toFixed(0)}M</span>
          </li>
        ))}
      </ul>
      <div className="text-xs text-muted mt-2">Winner is the highest population-points controller when the war ends, or the last alliance with a surviving capital.</div>
    </div>
  );
}
