import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { AIRSTRIP_COST } from '@/game/camps';
import { patchPlayer } from '@/firebase/rooms';
import type { ArmyCamp, ArmyState, PlayerState, RoomState } from '@/types';

interface Props {
  room: RoomState;
  me: PlayerState;
}

// List the player's army camps and let them station units / build an airstrip.
export function CampsTab({ room, me }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  if (me.camps.length === 0) {
    return (
      <div className="panel p-6 text-center text-muted">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">No camps yet. Tap any friendly (green) country on the World tab to deploy one.</div>
      </div>
    );
  }

  async function station(camp: ArmyCamp, unitKey: keyof ArmyState) {
    if (me.army[unitKey] <= 0) return;
    setBusy(`${camp.id}:${unitKey}`);
    try {
      const nextArmy = { ...me.army, [unitKey]: me.army[unitKey] - 1 };
      const nextCamps = me.camps.map((c) => c.id === camp.id
        ? { ...c, garrison: { ...c.garrison, [unitKey]: c.garrison[unitKey] + 1 } }
        : c
      );
      await patchPlayer(room.id, me.uid, { army: nextArmy, camps: nextCamps });
    } finally {
      setBusy(null);
    }
  }

  async function buildAirstrip(camp: ArmyCamp) {
    if (camp.hasAirstrip || me.money < AIRSTRIP_COST) return;
    setBusy(`${camp.id}:airstrip`);
    try {
      const nextCamps = me.camps.map((c) => c.id === camp.id ? { ...c, hasAirstrip: true } : c);
      await patchPlayer(room.id, me.uid, { camps: nextCamps, money: me.money - AIRSTRIP_COST });
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="space-y-3">
      {me.camps.map((c) => {
        const host = COUNTRY_BY_CODE[c.hostCountryCode];
        return (
          <li key={c.id} className="panel p-3">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="font-semibold">{host?.name ?? c.hostCountryCode}</div>
                <div className="text-xs text-muted">Camp #{c.id.slice(0, 4)} · since Day {c.createdDay}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted">HP</div>
                <div className="font-mono text-sm">{c.hp}/{c.maxHp}</div>
              </div>
            </div>
            <div className="stat-bar mb-3"><div className="h-full bg-good" style={{ width: `${(c.hp / c.maxHp) * 100}%` }} /></div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <StationBtn label="🪖 Infantry" count={c.garrison.infantry} have={me.army.infantry} busy={busy === `${c.id}:infantry`} onClick={() => station(c, 'infantry')} />
              <StationBtn label="🛡️ Tanks" count={c.garrison.tanks} have={me.army.tanks} busy={busy === `${c.id}:tanks`} onClick={() => station(c, 'tanks')} />
              <StationBtn label="✈️ Fighters" count={c.garrison.fighters} have={me.army.fighters} busy={busy === `${c.id}:fighters`} onClick={() => station(c, 'fighters')} disabled={!c.hasAirstrip} title={c.hasAirstrip ? undefined : 'Build an airstrip first'} />
              <StationBtn label="🛫 Rafales" count={c.garrison.rafales} have={me.army.rafales} busy={busy === `${c.id}:rafales`} onClick={() => station(c, 'rafales')} disabled={!c.hasAirstrip} title={c.hasAirstrip ? undefined : 'Build an airstrip first'} />
            </div>

            <div className="mt-2">
              {c.hasAirstrip ? (
                <div className="text-xs text-good">✈ Airstrip operational</div>
              ) : (
                <button
                  className="btn-secondary w-full text-xs"
                  onClick={() => buildAirstrip(c)}
                  disabled={me.money < AIRSTRIP_COST || busy === `${c.id}:airstrip`}
                >
                  {busy === `${c.id}:airstrip` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                  Build airstrip · ${AIRSTRIP_COST}M
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function StationBtn({ label, count, have, onClick, busy, disabled, title }: {
  label: string; count: number; have: number; onClick: () => void; busy: boolean; disabled?: boolean; title?: string;
}) {
  return (
    <button
      className="panel-2 p-2 text-left border border-border hover:border-accent disabled:opacity-40"
      onClick={onClick}
      disabled={disabled || busy || have === 0}
      title={title}
    >
      <div className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-muted">{count}</span>
      </div>
      <div className="text-[10px] text-muted mt-0.5">{busy ? '...' : have > 0 ? `Station +1 (have ${have})` : 'Need units'}</div>
    </button>
  );
}
