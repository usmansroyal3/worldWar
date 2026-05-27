import { useState } from 'react';
import { Hammer, Loader2, Shield, ShoppingCart, Lightbulb, Lock } from 'lucide-react';
import { UNITS, unitCostFor } from '@/game/army';
import { canBuildUnit, effectiveGain, RESEARCH_PROJECTS } from '@/game/innovation';
import { patchPlayer, postNews } from '@/firebase/rooms';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { sfx } from '@/lib/sound';
import type { ArmyState, PlayerState, RoomState } from '@/types';
import { IronDomeModal } from './IronDomeModal';

interface Props {
  room: RoomState;
  me: PlayerState;
  day: number;
  onOpenMarket?: () => void;
}

const SECTIONS: { id: import('@/game/army').UnitDef['category']; label: string }[] = [
  { id: 'land', label: 'Land' },
  { id: 'air', label: 'Air' },
  { id: 'sea', label: 'Sea' },
  { id: 'strategic', label: 'Strategic' },
  { id: 'defense', label: 'Defense' },
];

export function PrepPanel({ room, me, day, onOpenMarket }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);
  const [showDome, setShowDome] = useState(false);

  async function build(unitKey: keyof ArmyState) {
    const unit = UNITS.find((u) => u.key === unitKey);
    if (!unit || unit.strategic) return;
    const gate = canBuildUnit(me, unitKey);
    if (!gate.ok) return;
    const cost = unitCostFor(unit, me.perks);
    if (me.money < cost) return;
    setBusy(unitKey);
    sfx.build();
    try {
      const nextArmy = { ...me.army, [unitKey]: me.army[unitKey] + unit.batchSize };
      await patchPlayer(room.id, me.uid, {
        army: nextArmy,
        money: me.money - cost,
        totals: { ...me.totals, spentOnBuilds: me.totals.spentOnBuilds + cost },
      });
      if (publish) {
        await postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'build',
          title: `${me.name} commissions ${unit.batchSize.toLocaleString()} ${unit.unitNoun ?? 'units'}`,
          body: `${COUNTRY_BY_CODE[me.countryCode ?? '']?.name ?? 'A nation'} adds ${unit.batchSize.toLocaleString()} ${unit.unitNoun ?? 'units'} to its ${unit.label.toLowerCase()}.`,
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-accent" />
            <h3 className="font-semibold">Build for war</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs" onClick={() => setShowDome(true)}>
              <Shield className="w-3.5 h-3.5" /> Iron Dome
            </button>
            {onOpenMarket && (
              <button className="btn-secondary text-xs" onClick={onOpenMarket}>
                <ShoppingCart className="w-3.5 h-3.5" /> Market
              </button>
            )}
          </div>
        </div>

        <label className="text-xs text-muted flex items-center gap-1.5 mb-2">
          <input type="checkbox" className="accent-accent" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
          Announce builds in news (other leaders can inspire — and target you)
        </label>

        {SECTIONS.map((section) => {
          const inSection = UNITS.filter((u) => u.category === section.id);
          if (inSection.length === 0) return null;
          return (
            <div key={section.id} className="mb-3">
              <div className="text-xs uppercase tracking-wider text-muted mb-1.5">{section.label}</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {inSection.map((u) => {
                  const cost = unitCostFor(u, me.perks);
                  const isNuke = u.strategic;
                  const canAfford = me.money >= cost;
                  const gate = canBuildUnit(me, u.key);
                  const locked = !gate.ok;
                  const disabled = isNuke || !canAfford || busy === u.key || locked;
                  return (
                    <button
                      key={u.key}
                      onClick={() => !isNuke && build(u.key)}
                      disabled={disabled}
                      className="panel-2 p-3 text-left border border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isNuke ? 'Nuclear warheads are not purchasable — seeded from real-world arsenals.' : locked ? `Locked — need ${gate.need} innovation` : undefined}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">{u.emoji} {u.label}{locked && <Lock className="w-3 h-3 inline text-warn ml-1" />}</span>
                        <span className="font-mono text-xs text-warn">{isNuke ? '—' : `$${cost}M`}</span>
                      </div>
                      <div className="text-xs text-muted mt-1">
                        You have <span className="text-ink font-mono">{me.army[u.key].toLocaleString()}</span>
                        {u.batchSize > 1 && <span> · +{u.batchSize.toLocaleString()} per buy</span>}
                        {u.capitalDmg > 0 && <span> · {u.capitalDmg} dmg/unit</span>}
                        {u.groundOnly && <span> · Ground only</span>}
                        {u.defensive && <span> · Defensive</span>}
                      </div>
                      {locked && <div className="text-xs text-warn mt-1">🔒 Needs Innovation ≥ {gate.need} (you have {me.innovation})</div>}
                      {u.description && <div className="text-xs text-muted mt-1 italic">{u.description}</div>}
                      {busy === u.key && <Loader2 className="w-3.5 h-3.5 animate-spin mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Research projects — spend money to grind innovation */}
        <div className="mb-3 panel-2 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-warn" />
            <span className="text-sm font-semibold">R&amp;D Projects</span>
            <span className="text-xs text-muted ml-auto">Innovation: <span className="text-ink font-mono">{me.innovation}</span></span>
          </div>
          <div className="grid sm:grid-cols-3 gap-2">
            {RESEARCH_PROJECTS.map((p) => {
              const gain = effectiveGain(me.innovation, p.gain);
              const afford = me.money >= p.cost;
              return (
                <button
                  key={p.id}
                  className="panel p-2 text-left text-xs border border-border hover:border-accent disabled:opacity-50"
                  disabled={!afford || busy === `research:${p.id}`}
                  onClick={async () => {
                    setBusy(`research:${p.id}` as any);
                    sfx.notify();
                    try {
                      await patchPlayer(room.id, me.uid, {
                        money: me.money - p.cost,
                        innovation: Math.min(100, me.innovation + gain),
                      });
                    } finally { setBusy(null); }
                  }}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{p.label}</span>
                    <span className="font-mono text-warn">${p.cost}M</span>
                  </div>
                  <div className="text-muted mt-1">+{gain} innovation{gain !== p.gain && <span className="text-warn"> (diminishing)</span>}</div>
                  <div className="text-muted mt-0.5">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-muted mt-1">
          Cost discount with Diplomat perk. Industrial perk adds passive treasury yield each day.
        </div>
      </div>

      <IronDomeModal open={showDome} onClose={() => setShowDome(false)} room={room} me={me} day={day} />
    </div>
  );
}
