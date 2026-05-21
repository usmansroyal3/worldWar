import { useMemo, useState } from 'react';
import { Crosshair, Loader2, Plane, Rocket, Ship, Shield, Skull, Anchor } from 'lucide-react';
import { UNITS } from '@/game/army';
import { COUNTRIES_BY_NAME, COUNTRY_BY_CODE } from '@/data/countries';
import { getRelationship } from '@/game/relationships';
import { hasGroundReachTo } from '@/game/camps';
import { patchPlayer, postNews } from '@/firebase/rooms';
import type { PlayerState, RoomState } from '@/types';
import { NukeLauncher } from './NukeLauncher';
import { IronDomeModal } from './IronDomeModal';

interface Props {
  room: RoomState;
  me: PlayerState;
  day: number;
}

type StrikeKind = 'fighters' | 'rafales' | 'stealth' | 'bombers' | 'ships' | 'subs' | 'missiles' | 'ground';

export function WarPanel({ room, me, day }: Props) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState<StrikeKind | null>(null);
  const [showNuke, setShowNuke] = useState(false);
  const [showDome, setShowDome] = useState(false);

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
      if (me.army[unitKey] <= 0) { setBusy(null); return; }

      const unitDef = UNITS.find((u) => u.key === unitKey)!;

      if (kind === 'ground' && !hasGroundReachTo(me, target)) {
        setBusy(null);
        await postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'system',
          title: 'Ground attack failed',
          body: `${COUNTRY_BY_CODE[me.countryCode]?.name} could not invade ${COUNTRY_BY_CODE[target]?.name}: no shared land border (deploy a camp in a neighbouring friendly country).`,
        });
        return;
      }

      // Iron Dome interception for missile attacks against a player target.
      let intercepted = false;
      if (kind === 'missiles' && targetPlayer && targetPlayer.ironDome.activeUntilDay >= day) {
        // Defender pays one missile cost per intercept. If they can afford it, intercept succeeds.
        const interceptCost = 80;
        if (targetPlayer.money >= interceptCost) {
          intercepted = true;
          await patchPlayer(room.id, targetPlayer.uid, {
            money: targetPlayer.money - interceptCost,
            ironDome: { ...targetPlayer.ironDome, interceptsToday: targetPlayer.ironDome.interceptsToday + 1 },
          });
          await postNews(room.id, {
            authorId: me.uid,
            authorName: me.name,
            authorCountry: me.countryCode,
            day,
            kind: 'intercept',
            title: `🛡️ Iron Dome intercepts ${me.name}'s missile`,
            body: `${COUNTRY_BY_CODE[targetPlayer.countryCode!]?.name}'s Iron Dome shoots down an incoming missile from ${COUNTRY_BY_CODE[me.countryCode]?.name}.`,
            meta: { routeFrom: me.countryCode, routeTo: target, intercepted: true },
          });
        }
      }

      // Decrement one of my units regardless (the missile is spent in either case)
      const nextArmy = { ...me.army, [unitKey]: me.army[unitKey] - 1 };

      // Resolve damage (stealth bypasses 50% of air defense; we apply a simple
      // damage reduction here representing air defense interception)
      let dmg = unitDef.capitalDmg;
      if (targetPlayer && unitDef.category === 'air' && targetPlayer.army.airDefense > 0 && !intercepted) {
        const reduce = unitDef.key === 'stealth' ? 0.5 : 1;
        const interceptedAir = Math.random() < 0.25 * reduce ? true : false;
        if (interceptedAir) dmg = 0;
      }
      if (intercepted) dmg = 0;

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

      if (!intercepted) {
        tasks.push(
          postNews(room.id, {
            authorId: me.uid,
            authorName: me.name,
            authorCountry: me.countryCode,
            day,
            kind: 'attack',
            title: `${COUNTRY_BY_CODE[me.countryCode]?.name} strikes ${COUNTRY_BY_CODE[target]?.name}`,
            body: dmg > 0
              ? `A ${unitDef.label} attack inflicts ${dmg} capital damage.`
              : `${unitDef.label} attack repelled by air defense — no damage.`,
            meta: { unit: unitDef.key, dmg, routeFrom: me.countryCode, routeTo: target },
          })
        );
      }

      await Promise.all(tasks);
    } finally {
      setBusy(null);
    }
  }

  const groundReach = target ? hasGroundReachTo(me, target) : true;
  const nukeReady = me.army.nukes > 0 && me.morale >= 95 && me.reputation >= 95;
  const domeActive = me.ironDome.activeUntilDay >= day;

  return (
    <div className="space-y-3">
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-bad" />
            <h3 className="font-semibold">Strike orders</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-xs" onClick={() => setShowDome(true)}>
              <Shield className="w-3.5 h-3.5" /> Dome {domeActive ? <span className="text-good">ON</span> : 'OFF'}
            </button>
            {me.army.nukes > 0 && (
              <button className={`btn-danger text-xs ${nukeReady ? '' : 'opacity-70'}`} onClick={() => setShowNuke(true)}>
                <Skull className="w-3.5 h-3.5" /> Nuke ({me.army.nukes})
              </button>
            )}
          </div>
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
            {!groundReach && (
              <> · No ground reach (need shared border or camp in neighbouring friendly country)</>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          <StrikeBtn label="Ground" emoji="🪖" busy={busy === 'ground'} disabled={!target || me.army.infantry === 0 || !groundReach} onClick={() => strike('ground')} />
          <StrikeBtn label="Fighters" emoji="✈️" icon={<Plane className="w-3.5 h-3.5" />} busy={busy === 'fighters'} disabled={!target || me.army.fighters === 0} onClick={() => strike('fighters')} />
          <StrikeBtn label="Rafale" emoji="🛫" busy={busy === 'rafales'} disabled={!target || me.army.rafales === 0} onClick={() => strike('rafales')} />
          <StrikeBtn label="Stealth" emoji="🦇" busy={busy === 'stealth'} disabled={!target || me.army.stealth === 0} onClick={() => strike('stealth')} />
          <StrikeBtn label="Bombers" emoji="🛩️" busy={busy === 'bombers'} disabled={!target || me.army.bombers === 0} onClick={() => strike('bombers')} />
          <StrikeBtn label="Naval" emoji="🚢" icon={<Ship className="w-3.5 h-3.5" />} busy={busy === 'ships'} disabled={!target || me.army.ships === 0} onClick={() => strike('ships')} />
          <StrikeBtn label="Submarine" emoji="⚓" icon={<Anchor className="w-3.5 h-3.5" />} busy={busy === 'subs'} disabled={!target || me.army.subs === 0} onClick={() => strike('subs')} />
          <StrikeBtn label="Missile" emoji="🚀" icon={<Rocket className="w-3.5 h-3.5" />} busy={busy === 'missiles'} disabled={!target || me.army.missiles === 0} onClick={() => strike('missiles')} />
        </div>

        <div className="text-xs text-muted mt-3 space-y-1">
          <div>Each strike consumes one unit. Capital HP starts at 10 000.</div>
          <div>Air defense intercepts ~25% of incoming aircraft (stealth bypasses 50% of that).</div>
          <div>Iron Dome (when active) intercepts incoming missiles at ${80}M per attempt.</div>
        </div>
      </div>

      <NukeLauncher open={showNuke} onClose={() => setShowNuke(false)} room={room} me={me} day={day} />
      <IronDomeModal open={showDome} onClose={() => setShowDome(false)} room={room} me={me} day={day} />
    </div>
  );
}

function StrikeBtn({ label, emoji, busy, disabled, onClick, icon }: {
  label: string; emoji: string; busy: boolean; disabled: boolean; onClick: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      className="btn-secondary flex-col items-center py-2 text-xs h-16"
      disabled={disabled || busy}
      onClick={onClick}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ?? <span className="text-lg leading-none">{emoji}</span>}
      <span className="mt-0.5">{label}</span>
    </button>
  );
}
