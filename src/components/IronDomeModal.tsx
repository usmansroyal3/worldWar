import { useState } from 'react';
import { X, Shield, Loader2 } from 'lucide-react';
import { patchPlayer, postNews } from '@/firebase/rooms';
import { UNIT_BY_KEY, unitCostFor } from '@/game/army';
import type { PlayerState, RoomState } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  me: PlayerState;
  day: number;
}

const DAILY_UPKEEP = 80; // matches missile cost — each intercept is paid out of operating cash

export function IronDomeModal({ open, onClose, room, me, day }: Props) {
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const battery = unitCostFor(UNIT_BY_KEY.ironDomes, me.perks);
  const hasBattery = me.army.ironDomes >= 1;
  const upkeep = days * DAILY_UPKEEP;
  const totalCost = (hasBattery ? 0 : battery) + upkeep;
  const isActive = me.ironDome.activeUntilDay >= day;

  async function buyAndActivate() {
    if (me.money < totalCost) return;
    setBusy(true);
    try {
      const nextArmy = { ...me.army };
      if (!hasBattery) nextArmy.ironDomes = (nextArmy.ironDomes ?? 0) + 1;
      await patchPlayer(room.id, me.uid, {
        army: nextArmy,
        money: me.money - totalCost,
        ironDome: { activeUntilDay: day + days, interceptsToday: 0 },
      });
      await postNews(room.id, {
        authorId: me.uid,
        authorName: me.name,
        authorCountry: me.countryCode,
        day,
        kind: 'system',
        title: `${me.name} activates Iron Dome`,
        body: `Defensive systems engaged for ${days} day${days === 1 ? '' : 's'}.`,
        meta: { domeUntilDay: day + days },
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    try {
      await patchPlayer(room.id, me.uid, {
        ironDome: { activeUntilDay: 0, interceptsToday: 0 },
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-end sm:items-center justify-center p-3">
      <div className="panel w-full max-w-md p-4 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="w-5 h-5 text-accent" />
            Iron Dome control
          </div>
          <button className="p-1 rounded-lg hover:bg-panel2" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="text-xs text-muted mb-3">
          The Iron Dome intercepts incoming missiles, but each interception costs you one
          missile's worth (${DAILY_UPKEEP}M). The costliest weapon in your arsenal.
          {me.army.ironDomes > 1 && (
            <div className="mt-1 text-good">You own {me.army.ironDomes} batteries — interception chance scales additively (capped at 95%).</div>
          )}
        </div>

        {isActive ? (
          <div className="panel-2 p-3 mb-3">
            <div className="text-sm font-semibold text-good mb-1">Currently active</div>
            <div className="text-xs text-muted">Through Day {me.ironDome.activeUntilDay}. Intercepts today: {me.ironDome.interceptsToday}.</div>
          </div>
        ) : null}

        <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
          Activate for <span className="text-ink font-mono">{days}</span> day{days === 1 ? '' : 's'}
        </label>
        <input
          type="range"
          min={1}
          max={7}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full accent-accent mb-3"
        />

        <div className="space-y-1 text-sm mb-4">
          <Row label={`Battery (1 needed)`} value={hasBattery ? 'owned ✓' : `$${battery}M`} />
          <Row label={`Operating upkeep`} value={`${days} × $${DAILY_UPKEEP}M = $${upkeep}M`} />
          <Row label="Total now" value={`$${totalCost}M`} bold />
          <Row label="Your treasury" value={`$${me.money}M`} dim />
        </div>

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={busy}>Cancel</button>
          {isActive && (
            <button className="btn-secondary flex-1" onClick={deactivate} disabled={busy}>Stand down</button>
          )}
          <button className="btn-primary flex-1" onClick={buyAndActivate} disabled={busy || me.money < totalCost}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {isActive ? 'Extend' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, dim }: { label: string; value: string; bold?: boolean; dim?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={dim ? 'text-muted text-xs' : 'text-muted text-xs'}>{label}</span>
      <span className={`font-mono ${bold ? 'text-warn' : dim ? 'text-muted text-xs' : ''}`}>{value}</span>
    </div>
  );
}
