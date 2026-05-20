import { useState } from 'react';
import { Hammer, Loader2 } from 'lucide-react';
import { UNITS, unitCostFor } from '@/game/army';
import { patchPlayer, postNews } from '@/firebase/rooms';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { PlayerState, RoomState } from '@/types';

interface Props {
  room: RoomState;
  me: PlayerState;
  day: number;
}

export function PrepPanel({ room, me, day }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);

  async function build(unitKey: keyof typeof me.army) {
    const unit = UNITS.find((u) => u.key === unitKey);
    if (!unit) return;
    const cost = unitCostFor(unit, me.perks);
    if (me.money < cost) return;
    setBusy(unitKey);
    try {
      const nextArmy = { ...me.army, [unitKey]: me.army[unitKey] + 1 };
      await patchPlayer(room.id, me.uid, {
        army: nextArmy,
        money: me.money - cost,
      });
      if (publish) {
        await postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'build',
          title: `${me.name} builds a ${unit.label}`,
          body: `${COUNTRY_BY_CODE[me.countryCode ?? '']?.name ?? 'A nation'} commissions a new ${unit.label.toLowerCase()}.`,
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Hammer className="w-4 h-4 text-accent" />
          <h3 className="font-semibold">Build for war</h3>
        </div>
        <label className="text-xs text-muted flex items-center gap-1.5">
          <input type="checkbox" className="accent-accent" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          Announce in news
        </label>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {UNITS.map((u) => {
          const cost = unitCostFor(u, me.perks);
          const canAfford = me.money >= cost;
          return (
            <button
              key={u.key}
              onClick={() => build(u.key)}
              disabled={!canAfford || busy === u.key}
              className="panel-2 p-3 text-left border border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">{u.emoji} {u.label}</span>
                <span className="font-mono text-xs text-warn">${cost}M</span>
              </div>
              <div className="text-xs text-muted mt-1">
                You have <span className="text-ink font-mono">{me.army[u.key]}</span>
                {u.capitalDmg > 0 && <span> · {u.capitalDmg} cap. dmg</span>}
                {u.groundOnly && <span> · Ground only</span>}
                {u.longRange && <span> · Long range</span>}
              </div>
              {busy === u.key && <Loader2 className="w-3.5 h-3.5 animate-spin mt-1" />}
            </button>
          );
        })}
      </div>
      <div className="text-xs text-muted mt-3">
        Cost discount with the Diplomat perk. Production speed scales with the Industrial perk
        (applied at end-of-day in a future update).
      </div>
    </div>
  );
}
