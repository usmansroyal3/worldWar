import { useMemo, useState } from 'react';
import { Crosshair, Loader2, Plane, Rocket, Ship } from 'lucide-react';
import { UNITS } from '@/game/army';
import { COUNTRIES_BY_NAME, COUNTRY_BY_CODE } from '@/data/countries';
import { getRelationship, viewerSharesLandBorder } from '@/game/relationships';
import { patchPlayer, postNews } from '@/firebase/rooms';
import type { PlayerState, RoomState } from '@/types';

interface Props {
  room: RoomState;
  me: PlayerState;
  day: number;
}

type StrikeKind = 'fighters' | 'bombers' | 'ships' | 'missiles' | 'ground';

export function WarPanel({ room, me, day }: Props) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState<StrikeKind | null>(null);

  const enemyPlayers = useMemo(() => {
    return Object.values(room.players).filter(
      (p) => p.uid !== me.uid && p.countryCode && (
        !me.allianceId || me.allianceId !== p.allianceId
      )
    );
  }, [room.players, me.uid, me.allianceId]);

  async function strike(kind: StrikeKind) {
    if (!target || !me.countryCode) return;
    setBusy(kind);
    try {
      const targetPlayer = Object.values(room.players).find((p) => p.countryCode === target);
      const unitKey = kind === 'ground' ? 'infantry' : kind;
      const haveUnit = me.army[unitKey] > 0;
      if (!haveUnit) { setBusy(null); return; }

      const unitDef = UNITS.find((u) => u.key === unitKey)!;

      // Range check for ground vs long-range
      if (kind === 'ground' && !viewerSharesLandBorder(room, me, target)) {
        setBusy(null);
        await postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'system',
          title: 'Ground attack failed',
          body: `${COUNTRY_BY_CODE[me.countryCode]?.name} could not invade ${COUNTRY_BY_CODE[target]?.name}: no shared land border.`,
        });
        return;
      }

      // Decrement one unit, deal damage
      const nextArmy = { ...me.army, [unitKey]: me.army[unitKey] - 1 };
      const dmg = unitDef.capitalDmg;

      const tasks: Promise<unknown>[] = [
        patchPlayer(room.id, me.uid, { army: nextArmy }),
      ];

      if (targetPlayer && dmg > 0) {
        const newHp = Math.max(0, targetPlayer.capital.hp - dmg);
        tasks.push(
          patchPlayer(room.id, targetPlayer.uid, {
            capital: { ...targetPlayer.capital, hp: newHp },
          })
        );
      }

      tasks.push(
        postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'attack',
          title: `${COUNTRY_BY_CODE[me.countryCode]?.name} strikes ${COUNTRY_BY_CODE[target]?.name}`,
          body: `A ${unitDef.label} attack inflicts ${dmg} capital damage.`,
          meta: { unit: unitDef.key, dmg },
        })
      );

      await Promise.all(tasks);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="w-4 h-4 text-bad" />
        <h3 className="font-semibold">Strike orders</h3>
      </div>
      <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Target country</label>
      <select
        className="input w-full mb-3"
        value={target ?? ''}
        onChange={(e) => setTarget(e.target.value || null)}
      >
        <option value="">Choose target...</option>
        <optgroup label="Players">
          {enemyPlayers.map((p) => (
            <option key={p.uid} value={p.countryCode!}>{COUNTRY_BY_CODE[p.countryCode!]?.name} (player: {p.name})</option>
          ))}
        </optgroup>
        <optgroup label="NPC nations">
          {COUNTRIES_BY_NAME
            .filter((c) => !Object.values(room.players).some((p) => p.countryCode === c.code))
            .filter((c) => me.countryCode && getRelationship(room, me.countryCode, c.code) !== 'friendly')
            .map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
        </optgroup>
      </select>

      {target && me.countryCode && (
        <div className="text-xs text-muted mb-3">
          Relationship: <span className="text-ink">{getRelationship(room, me.countryCode, target)}</span>
          {!viewerSharesLandBorder(room, me, target) && (
            <> · No land border (ground attack disabled)</>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StrikeBtn label="Ground" emoji="🪖" busy={busy === 'ground'} disabled={!target || me.army.infantry === 0} onClick={() => strike('ground')} />
        <StrikeBtn label="Fighters" emoji="✈️" icon={<Plane className="w-3.5 h-3.5" />} busy={busy === 'fighters'} disabled={!target || me.army.fighters === 0} onClick={() => strike('fighters')} />
        <StrikeBtn label="Bombers" emoji="🛩️" busy={busy === 'bombers'} disabled={!target || me.army.bombers === 0} onClick={() => strike('bombers')} />
        <StrikeBtn label="Naval" emoji="🚢" icon={<Ship className="w-3.5 h-3.5" />} busy={busy === 'ships'} disabled={!target || me.army.ships === 0} onClick={() => strike('ships')} />
        <StrikeBtn label="Missile" emoji="🚀" icon={<Rocket className="w-3.5 h-3.5" />} busy={busy === 'missiles'} disabled={!target || me.army.missiles === 0} onClick={() => strike('missiles')} />
      </div>
      <div className="text-xs text-muted mt-3">
        Each strike consumes one unit. Capital HP starts at 10000 — multiple strikes will be needed.
      </div>
    </div>
  );
}

function StrikeBtn({ label, emoji, busy, disabled, onClick, icon }: {
  label: string; emoji: string; busy: boolean; disabled: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      className="btn-secondary flex-col items-center py-2 text-xs"
      disabled={disabled || busy}
      onClick={onClick}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ?? <span className="text-lg leading-none">{emoji}</span>}
      <span className="mt-0.5">{label}</span>
    </button>
  );
}
