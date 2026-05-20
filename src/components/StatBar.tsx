import type { PlayerState } from '@/types';
import { Heart, Smile, Coins, Lightbulb, Megaphone, ShieldAlert } from 'lucide-react';
import { armyTotal } from '@/game/army';

export function StatBar({ me }: { me: PlayerState }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
      <Stat icon={<Smile className="w-3.5 h-3.5" />} label="Morale" value={me.morale} max={100} color="bg-good" />
      <Stat icon={<Megaphone className="w-3.5 h-3.5" />} label="Reputation" value={me.reputation} max={100} color="bg-accent" />
      <Stat icon={<Coins className="w-3.5 h-3.5" />} label="Treasury" value={me.money} unit="M$" color="bg-warn" rawValue />
      <Stat icon={<Lightbulb className="w-3.5 h-3.5" />} label="Innovation" value={me.innovation} max={100} color="bg-warn" />
      <Stat icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Army" value={armyTotal(me.army)} color="bg-panel2" rawValue />
      <Stat icon={<Heart className="w-3.5 h-3.5" />} label="Capital HP" value={me.capital.hp} max={me.capital.maxHp} color="bg-bad" />
    </div>
  );
}

function Stat({ icon, label, value, max, unit, color, rawValue }: {
  icon: React.ReactNode; label: string; value: number; max?: number; unit?: string; color: string; rawValue?: boolean;
}) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : null;
  return (
    <div className="panel-2 p-2">
      <div className="flex items-center justify-between mb-1 text-muted">
        <span className="flex items-center gap-1">{icon}{label}</span>
        <span className="font-mono text-ink">{rawValue ? value.toLocaleString() : `${Math.round(value)}${max ? `/${max}` : ''}`}{unit ?? ''}</span>
      </div>
      {pct !== null && (
        <div className="stat-bar"><div className={`h-full ${color}`} style={{ width: `${pct}%` }} /></div>
      )}
    </div>
  );
}
