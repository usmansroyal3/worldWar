import { useMemo, useState } from 'react';
import { Crosshair, Loader2, Shield, Skull, Zap } from 'lucide-react';
import { UNITS, type UnitDef } from '@/game/army';
import { COUNTRIES_BY_NAME, COUNTRY_BY_CODE } from '@/data/countries';
import { getRelationship } from '@/game/relationships';
import { hasGroundReachTo } from '@/game/camps';
import { captureTerritory, mergeEliminatedPlayer, postNews } from '@/firebase/rooms';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getStatus, WAR_BREAK_REP_PENALTY } from '@/game/diplomacy2';
import { sfx } from '@/lib/sound';
import type { ArmyState, PlayerState, RoomState } from '@/types';
import { NukeLauncher } from './NukeLauncher';
import { IronDomeModal } from './IronDomeModal';

interface Props {
  room: RoomState;
  me: PlayerState;
  day: number;
}

// Strike units that can be committed individually via the sliders.
const STRIKE_KEYS: (keyof ArmyState)[] = [
  'infantry', 'tanks',
  'fighters', 'rafales', 'stealth', 'bombers',
  'ships', 'subs',
  'missiles',
];

const MISSILE_INTERCEPT_COST = 80;

export function WarPanel({ room, me, day }: Props) {
  const [target, setTarget] = useState<string | null>(null);
  const [commit, setCommit] = useState<Partial<Record<keyof ArmyState, number>>>({});
  const [busy, setBusy] = useState(false);
  const [showNuke, setShowNuke] = useState(false);
  const [showDome, setShowDome] = useState(false);

  const enemyPlayers = useMemo(() => {
    return Object.values(room.players).filter(
      (p) => p.uid !== me.uid && p.countryCode && (
        !me.allianceId || me.allianceId !== p.allianceId
      )
    );
  }, [room.players, me.uid, me.allianceId]);

  const groundReach = target ? hasGroundReachTo(me, target) : true;
  const targetPlayer = target ? Object.values(room.players).find((p) => p.countryCode === target) : null;
  const targetCountry = target ? COUNTRY_BY_CODE[target] : null;

  // Live damage preview based on current commit values.
  const preview = useMemo(() => {
    let raw = 0;
    let afterAir = 0;
    let afterDome = 0;
    for (const k of STRIKE_KEYS) {
      const n = Math.min(commit[k] ?? 0, me.army[k]);
      if (n <= 0) continue;
      const unit = UNITS.find((u) => u.key === k)!;
      if (unit.groundOnly && (!target || !groundReach)) continue;
      const baseDmg = unit.capitalDmg * n;
      raw += baseDmg;
      // Air defense reduction (probabilistic in resolve; expected value here)
      let dmgAfterAir = baseDmg;
      if (targetPlayer && unit.category === 'air' && targetPlayer.army.airDefense > 0) {
        const interceptChance = unit.key === 'stealth' ? 0.125 : 0.25;
        dmgAfterAir = baseDmg * (1 - interceptChance);
      }
      afterAir += dmgAfterAir;
      // Iron Dome (missiles)
      let dmgAfterDome = dmgAfterAir;
      if (targetPlayer && unit.key === 'missiles' && targetPlayer.ironDome.activeUntilDay >= day) {
        const canIntercept = Math.floor(targetPlayer.money / MISSILE_INTERCEPT_COST);
        const intercepted = Math.min(n, canIntercept);
        dmgAfterDome = dmgAfterAir * (1 - intercepted / n);
      }
      afterDome += dmgAfterDome;
    }
    return {
      raw: Math.round(raw),
      expected: Math.round(afterDome),
      committedAny: STRIKE_KEYS.some((k) => (commit[k] ?? 0) > 0),
    };
  }, [commit, me.army, target, targetPlayer, groundReach, day]);

  function setSlider(key: keyof ArmyState, value: number) {
    setCommit((c) => ({ ...c, [key]: Math.max(0, Math.min(value, me.army[key])) }));
  }

  async function launch() {
    if (!target || !me.countryCode || !preview.committedAny) return;
    setBusy(true);
    sfx.launch();
    try {
      // Resolve per-unit-type damage with stochastic intercepts.
      const updates: Record<string, unknown> = {};
      const nextArmy: ArmyState = { ...me.army };
      let totalDealt = 0;
      let totalIntercepted = 0;
      const breakdown: Record<string, number> = {};
      // unit-key → count committed; used by the BattleLayer to spawn sprites
      const unitsCommitted: Record<string, number> = {};
      let primaryUnit: string = 'missiles';
      let primaryDmg = 0;
      let domeIntercepts = 0;
      let domeCost = 0;
      let defenderMoney = targetPlayer?.money ?? 0;

      for (const k of STRIKE_KEYS) {
        const n = Math.min(commit[k] ?? 0, me.army[k]);
        if (n <= 0) continue;
        const unit = UNITS.find((u) => u.key === k)!;
        if (unit.groundOnly && !groundReach) continue;
        nextArmy[k] -= n;
        unitsCommitted[k] = n;
        let dmg = unit.capitalDmg * n;
        if (dmg > primaryDmg) { primaryDmg = dmg; primaryUnit = k; }
        // Air defense interception (probabilistic per round)
        if (targetPlayer && unit.category === 'air' && targetPlayer.army.airDefense > 0) {
          const interceptChance = unit.key === 'stealth' ? 0.125 : 0.25;
          let intercepted = 0;
          for (let i = 0; i < n; i++) if (Math.random() < interceptChance) intercepted++;
          dmg -= intercepted * unit.capitalDmg;
          totalIntercepted += intercepted * unit.capitalDmg;
        }
        // Iron Dome (missiles only)
        if (targetPlayer && unit.key === 'missiles' && targetPlayer.ironDome.activeUntilDay >= day) {
          const affordable = Math.floor(defenderMoney / MISSILE_INTERCEPT_COST);
          const tryIntercept = Math.min(n, affordable);
          domeIntercepts += tryIntercept;
          domeCost += tryIntercept * MISSILE_INTERCEPT_COST;
          defenderMoney -= tryIntercept * MISSILE_INTERCEPT_COST;
          dmg -= tryIntercept * unit.capitalDmg;
        }
        dmg = Math.max(0, dmg);
        breakdown[unit.label] = (breakdown[unit.label] ?? 0) + dmg;
        totalDealt += dmg;
      }

      // Patch attacker (army down + totals + fatigue)
      updates[`players.${me.uid}.army`] = nextArmy;
      updates[`players.${me.uid}.fatigueToday`] = (me.fatigueToday ?? 0) + totalDealt;
      updates[`players.${me.uid}.totals`] = {
        ...me.totals,
        damageDealt: me.totals.damageDealt + totalDealt,
      };

      // Diplomatic surprise-attack penalty
      if (targetPlayer) {
        const status = getStatus(room, me.uid, targetPlayer.uid);
        if (status === 'peace' || status === 'ceasefire') {
          const penalty = status === 'ceasefire' ? 40 : WAR_BREAK_REP_PENALTY;
          updates[`players.${me.uid}.reputation`] = Math.max(0, Math.round(me.reputation - penalty));
          updates[`diplomacy.${[me.uid, targetPlayer.uid].sort().join('__')}`] = {
            status: 'war', declaredAt: Date.now(), declaredBy: me.uid,
          };
        }
      }

      // Patch defender (capital HP, dome counters, money, damage-taken tally)
      let defenderKO = false;
      if (targetPlayer) {
        const newHp = Math.max(0, targetPlayer.capital.hp - totalDealt);
        defenderKO = newHp <= 0 && targetPlayer.capital.hp > 0;
        updates[`players.${targetPlayer.uid}.capital`] = { ...targetPlayer.capital, hp: newHp };
        updates[`players.${targetPlayer.uid}.totals`] = {
          ...targetPlayer.totals,
          damageTaken: targetPlayer.totals.damageTaken + totalDealt,
        };
        if (newHp <= 0) {
          updates[`players.${targetPlayer.uid}.eliminated`] = true;
        }
        if (domeIntercepts > 0) {
          updates[`players.${targetPlayer.uid}.ironDome`] = {
            ...targetPlayer.ironDome,
            interceptsToday: targetPlayer.ironDome.interceptsToday + domeIntercepts,
          };
          updates[`players.${targetPlayer.uid}.money`] = defenderMoney;
        }
      }

      // Apply all writes in one patch (single Firestore doc update)
      if (db) await updateDoc(doc(db, 'rooms', room.id), updates);

      // KO handling: with a ground commit the home country is annexed; either
      // way the defeated player is folded into the victor's side so their
      // remaining population counts toward it.
      if (defenderKO && targetPlayer) {
        sfx.capture();
        const groundCommit = !!(unitsCommitted.infantry || unitsCommitted.tanks);
        if (groundCommit) {
          await captureTerritory(room.id, me.uid, target, targetPlayer.uid);
        }
        const allianceName = await mergeEliminatedPlayer(room.id, me.uid, targetPlayer.uid);
        await postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'capture',
          title: `🏴 ${COUNTRY_BY_CODE[target]?.name} has fallen to ${COUNTRY_BY_CODE[me.countryCode!]?.name}`,
          body: `${targetPlayer.name}'s capital is destroyed.${groundCommit ? ` Their homeland is annexed by ${me.name}.` : ''}${allianceName ? ` ${targetPlayer.name} is absorbed into ${allianceName}.` : ''}`,
          meta: { capturedCode: target, formerOwnerUid: targetPlayer.uid },
        });
      } else if (totalDealt > 0) {
        sfx.impact();
      }
      if (domeIntercepts > 0) sfx.intercept();

      // News + animation event
      await postNews(room.id, {
        authorId: me.uid,
        authorName: me.name,
        authorCountry: me.countryCode,
        day,
        kind: 'attack',
        title: `${COUNTRY_BY_CODE[me.countryCode!]?.name} strikes ${targetCountry?.name}`,
        body:
          `Combined arms strike: ${Object.entries(breakdown).map(([l, d]) => `${l} ${Math.round(d)} dmg`).join(' · ')}.` +
          (domeIntercepts > 0 ? ` Iron Dome intercepted ${domeIntercepts} missile(s) ($${domeCost}M defender cost).` : '') +
          (totalIntercepted > 0 ? ` Air defense repelled ${Math.round(totalIntercepted)} damage.` : ''),
        meta: {
          routeFrom: me.countryCode!,
          routeTo: target!,
          dmg: Math.round(totalDealt),
          intercepted: domeIntercepts > 0,
          defended: !!(targetPlayer && targetPlayer.army.airDefense > 0),
          units: unitsCommitted,
          primaryUnit,
        },
      });

      setCommit({});
    } finally {
      setBusy(false);
    }
  }

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
          onChange={(e) => { setTarget(e.target.value || null); setCommit({}); }}
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
              <> · No ground reach (need shared border or a camp in a neighbouring friendly country)</>
            )}
            {targetPlayer && targetPlayer.army.airDefense > 0 && (
              <> · Target has {targetPlayer.army.airDefense} air defense {targetPlayer.army.airDefense === 1 ? 'battery' : 'batteries'}</>
            )}
            {targetPlayer && targetPlayer.ironDome.activeUntilDay >= day && (
              <> · 🛡️ Iron Dome ACTIVE</>
            )}
          </div>
        )}

        {/* Troop selection sliders, grouped by category */}
        {target && (
          <div className="space-y-3">
            <CategoryBlock title="Land — ground assault" me={me} commit={commit} setSlider={setSlider} cat="land" disabled={!groundReach} />
            <CategoryBlock title="Air sortie" me={me} commit={commit} setSlider={setSlider} cat="air" />
            <CategoryBlock title="Naval" me={me} commit={commit} setSlider={setSlider} cat="sea" />
            <CategoryBlock title="Missile" me={me} commit={commit} setSlider={setSlider} cat="strategic" filterKey="missiles" />
          </div>
        )}

        {/* Damage preview + launch */}
        {target && (
          <div className="mt-4 panel-2 p-3">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted">Expected capital damage</span>
              <div className="text-right">
                {preview.expected !== preview.raw && (
                  <div className="text-xs text-muted line-through">{preview.raw}</div>
                )}
                <div className="font-mono text-xl text-bad">{preview.expected}</div>
              </div>
            </div>
            {targetPlayer && (
              <div className="text-xs text-muted mb-3">
                Target HP: {targetPlayer.capital.hp.toLocaleString()} → {(targetPlayer.capital.hp - preview.expected).toLocaleString()}
              </div>
            )}
            <button
              className="btn-danger w-full"
              disabled={busy || !preview.committedAny}
              onClick={launch}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              LAUNCH STRIKE — {preview.expected} dmg
            </button>
          </div>
        )}

        <div className="text-xs text-muted mt-3 space-y-1">
          <div>One buy = {UNITS.find((u) => u.key === 'infantry')!.batchSize.toLocaleString()} infantry / {UNITS.find((u) => u.key === 'tanks')!.batchSize} tanks. Other units come 1 per buy.</div>
          <div>Stealth bypasses 50% of air defense. Iron Dome intercepts missiles at ${MISSILE_INTERCEPT_COST}M per attempt (defender pays).</div>
          <div>Capital HP starts at 100. Reduce to 0 to eliminate the enemy.</div>
        </div>
      </div>

      <NukeLauncher open={showNuke} onClose={() => setShowNuke(false)} room={room} me={me} day={day} />
      <IronDomeModal open={showDome} onClose={() => setShowDome(false)} room={room} me={me} day={day} />
    </div>
  );
}

function CategoryBlock({ title, me, commit, setSlider, cat, disabled, filterKey }: {
  title: string;
  me: PlayerState;
  commit: Partial<Record<keyof ArmyState, number>>;
  setSlider: (k: keyof ArmyState, v: number) => void;
  cat: UnitDef['category'];
  disabled?: boolean;
  filterKey?: keyof ArmyState;
}) {
  let units = UNITS.filter((u) => u.category === cat && !u.strategic && !u.defensive);
  if (cat === 'strategic') units = UNITS.filter((u) => u.key === 'missiles');
  if (filterKey) units = UNITS.filter((u) => u.key === filterKey);
  const ownedAny = units.some((u) => me.army[u.key] > 0);
  if (!ownedAny) return null;

  return (
    <div className={`panel-2 p-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="text-xs uppercase tracking-wider text-muted mb-2">{title}{disabled && <span className="ml-2 text-warn">disabled — no reach</span>}</div>
      <div className="space-y-3">
        {units.map((u) => {
          const owned = me.army[u.key];
          if (owned === 0) return null;
          const value = commit[u.key] ?? 0;
          const dmg = Math.round(value * u.capitalDmg);
          return (
            <div key={u.key}>
              <div className="flex items-baseline justify-between text-xs mb-1">
                <span>
                  <span className="mr-1">{u.emoji}</span>
                  <span className="font-medium">{u.label}</span>
                  <span className="text-muted ml-2">{u.capitalDmg} dmg / {u.unitNoun ?? 'unit'}</span>
                </span>
                <span className="font-mono">
                  <span className="text-ink">{value.toLocaleString()}</span>
                  <span className="text-muted"> / {owned.toLocaleString()}</span>
                  {dmg > 0 && <span className="text-bad ml-2">→ {dmg} dmg</span>}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={owned}
                step={u.batchSize >= 1000 ? 100 : 1}
                value={value}
                disabled={disabled}
                onChange={(e) => setSlider(u.key, Number(e.target.value))}
                className="w-full accent-bad"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
