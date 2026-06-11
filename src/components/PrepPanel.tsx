import { useState } from 'react';
import { Hammer, Loader2, Shield, ShoppingCart, Lightbulb, Lock, Factory } from 'lucide-react';
import { UNITS, unitCostFor } from '@/game/army';
import { canBuildUnit, effectiveGain, RESEARCH_PROJECTS } from '@/game/innovation';
import { buildDurationMs, buildSpeedFactor, formatBuildEta, makeBuildOrder } from '@/game/build';
import { patchPlayer, postNews } from '@/firebase/rooms';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { sfx } from '@/lib/sound';
import type { ArmyState, PlayerState, RoomState } from '@/types';
import { IronDomeModal } from './IronDomeModal';

interface Props {
  room: RoomState;
  me: PlayerState;
  day: number;
  // Current game-elapsed ms, shared with useBuildQueue so countdowns match.
  elapsedMs: number;
  onOpenMarket?: () => void;
}

const SECTIONS: { id: import('@/game/army').UnitDef['category']; label: string }[] = [
  { id: 'land', label: 'Land' },
  { id: 'air', label: 'Air' },
  { id: 'sea', label: 'Sea' },
  { id: 'strategic', label: 'Strategic' },
  { id: 'defense', label: 'Defense' },
];

export function PrepPanel({ room, me, day, elapsedMs, onOpenMarket }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [publish, setPublish] = useState(false);
  const [showDome, setShowDome] = useState(false);

  const queue = me.buildQueue ?? [];
  const speedFactor = buildSpeedFactor(me);

  async function build(unitKey: keyof ArmyState) {
    const unit = UNITS.find((u) => u.key === unitKey);
    if (!unit || unit.strategic) return;
    const gate = canBuildUnit(me, unitKey);
    if (!gate.ok) return;
    const cost = unitCostFor(unit, me.perks);
    if (me.money < cost) return;
    setBusy(unitKey);
    sfx.click();
    try {
      // Domestic production takes time — morale sets the pace. The order is
      // delivered into the army by useBuildQueue when its timer completes.
      const order = makeBuildOrder(unitKey, unit.batchSize, me, elapsedMs);
      await patchPlayer(room.id, me.uid, {
        buildQueue: [...queue, order],
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
          body: `${COUNTRY_BY_CODE[me.countryCode ?? '']?.name ?? 'A nation'} starts production of ${unit.batchSize.toLocaleString()} ${unit.unitNoun ?? 'units'} (${unit.label.toLowerCase()}).`,
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

        <div className="panel-2 p-2 mb-3 text-xs flex items-center gap-2">
          <Factory className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-muted">
            Production speed <span className="text-ink font-mono">{Math.round((1 / speedFactor) * 100)}%</span> — driven by
            morale ({Math.round(me.morale)}). High morale builds faster.
            {me.perks.includes('industrial') && <span className="text-good"> Industrial perk −25% time.</span>}
          </span>
        </div>

        {queue.length > 0 && (
          <div className="panel-2 p-3 mb-3">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">In production ({queue.length})</div>
            <ul className="space-y-1.5">
              {[...queue].sort((a, b) => a.readyAtElapsedMs - b.readyAtElapsedMs).map((o) => {
                const unit = UNITS.find((u) => u.key === o.unitKey);
                const remaining = o.readyAtElapsedMs - elapsedMs;
                const total = o.readyAtElapsedMs - o.placedAtElapsedMs;
                const pct = total > 0 ? Math.max(0, Math.min(100, ((total - remaining) / total) * 100)) : 100;
                return (
                  <li key={o.id} className="text-xs">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span>{unit?.emoji} {o.qty.toLocaleString()} {unit?.unitNoun ?? 'units'}</span>
                      <span className="font-mono text-warn">{remaining <= 0 ? 'delivering...' : formatBuildEta(remaining)}</span>
                    </div>
                    <div className="stat-bar"><div className="h-full bg-accent" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

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
                        {!isNuke && <span> · ⏱ {formatBuildEta(buildDurationMs(u.key, me))}</span>}
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
