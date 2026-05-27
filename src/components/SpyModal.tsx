import { useState } from 'react';
import { X, Eye, Loader2 } from 'lucide-react';
import { buildReport, intelCost, type IntelReport } from '@/game/intel';
import { UNITS } from '@/game/army';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { patchPlayer, postNews } from '@/firebase/rooms';
import { sfx } from '@/lib/sound';
import type { ArmyState, PlayerState, RoomState } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  me: PlayerState;
  target: PlayerState;
  day: number;
}

export function SpyModal({ open, onClose, room, me, target, day }: Props) {
  const [report, setReport] = useState<IntelReport | null>(null);
  const [busy, setBusy] = useState<'army' | 'budget' | 'full' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function run(kind: 'army' | 'budget' | 'full') {
    const cost = intelCost(kind);
    if (me.money < cost) { setError(`Need $${cost}M.`); return; }
    setBusy(kind);
    setError(null);
    sfx.notify();
    try {
      const r = buildReport(target, kind, day);
      setReport(r);
      await patchPlayer(room.id, me.uid, {
        money: me.money - cost,
        totals: { ...me.totals, intelOps: me.totals.intelOps + 1 },
      });
      // Don't broadcast — intel is private to the buyer.
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-end sm:items-center justify-center p-3">
      <div className="panel w-full max-w-md p-4 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold">
            <Eye className="w-5 h-5 text-accent" />
            Intelligence on {target.name}
          </div>
          <button className="p-1 rounded-lg hover:bg-panel2" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="text-xs text-muted mb-3">
          {target.countryCode ? COUNTRY_BY_CODE[target.countryCode]?.name : 'No country'} ·
          {target.allianceId && room.alliances[target.allianceId] ? ` ${room.alliances[target.allianceId].name}` : ' solo'}
        </div>

        {!report && (
          <div className="space-y-2 mb-3">
            <button
              className="w-full panel-2 p-3 text-left hover:border-accent border border-border disabled:opacity-50"
              disabled={busy !== null || me.money < intelCost('army')}
              onClick={() => run('army')}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">🛰️ Order of Battle</span>
                <span className="font-mono text-xs text-warn">${intelCost('army')}M</span>
              </div>
              <div className="text-xs text-muted mt-1">Full army composition + camp count.</div>
            </button>
            <button
              className="w-full panel-2 p-3 text-left hover:border-accent border border-border disabled:opacity-50"
              disabled={busy !== null || me.money < intelCost('budget')}
              onClick={() => run('budget')}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">💼 Financial Brief</span>
                <span className="font-mono text-xs text-warn">${intelCost('budget')}M</span>
              </div>
              <div className="text-xs text-muted mt-1">Treasury, innovation, morale, reputation.</div>
            </button>
            <button
              className="w-full panel-2 p-3 text-left hover:border-accent border border-border disabled:opacity-50"
              disabled={busy !== null || me.money < intelCost('full')}
              onClick={() => run('full')}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">🎯 Full Dossier</span>
                <span className="font-mono text-xs text-warn">${intelCost('full')}M</span>
              </div>
              <div className="text-xs text-muted mt-1">Everything — army + financials + camps.</div>
            </button>
            {busy && <div className="text-center text-xs text-muted"><Loader2 className="w-3.5 h-3.5 animate-spin inline" /> Gathering...</div>}
            {error && <div className="text-xs text-bad">{error}</div>}
          </div>
        )}

        {report && (
          <div className="space-y-3 text-sm">
            {report.army && (
              <section>
                <div className="text-xs uppercase tracking-wider text-muted mb-1">Forces</div>
                <ul className="grid grid-cols-2 gap-1">
                  {UNITS.map((u) => {
                    const n = report.army![u.key];
                    if (n === 0) return null;
                    return (
                      <li key={u.key} className="flex items-center justify-between text-xs panel-2 px-2 py-1">
                        <span>{u.emoji} {u.label}</span>
                        <span className="font-mono">{n.toLocaleString()}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="text-xs text-muted mt-1">Camps: {report.campsCount ?? 0}</div>
              </section>
            )}
            {report.money != null && (
              <section className="grid grid-cols-2 gap-2">
                <Field label="Treasury" value={`$${report.money?.toLocaleString()}M`} />
                <Field label="Innovation" value={`${report.innovation ?? 0}`} />
                <Field label="Morale" value={`${Math.round(report.morale ?? 0)}`} />
                <Field label="Reputation" value={`${Math.round(report.reputation ?? 0)}`} />
              </section>
            )}
            <div className="text-xs text-muted">Snapshot taken on Day {report.takenAtDay}. Not shared publicly.</div>
            <button className="btn-secondary w-full" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 p-2">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}
