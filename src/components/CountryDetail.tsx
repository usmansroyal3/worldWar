import { useMemo, useState } from 'react';
import { X, Globe2, Shield, ShoppingCart, Crosshair, MapPin, Loader2 } from 'lucide-react';
import { COUNTRY_BY_CODE, type CountryDef } from '@/data/countries';
import { relationshipRating, relationshipLabel } from '@/game/relationships';
import { CAMP_COST, MAX_CAMPS_PER_COUNTRY, canDeployCampIn, campsInCountry, makeCamp } from '@/game/camps';
import { listOffers, isMarketAccessible } from '@/game/market';
import { UNIT_BY_KEY } from '@/game/army';
import { patchPlayer, postNews } from '@/firebase/rooms';
import type { PlayerState, RoomState } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  countryCode: string | null;
  room: RoomState;
  me: PlayerState;
  day: number;
  onAttack?: (targetCode: string) => void;
}

export function CountryDetail({ open, onClose, countryCode, room, me, day, onAttack }: Props) {
  const [tab, setTab] = useState<'info' | 'camps' | 'market'>('info');
  const [busy, setBusy] = useState(false);

  if (!open || !countryCode) return null;

  const country = COUNTRY_BY_CODE[countryCode];
  if (!country) return null;

  const rating = me.countryCode ? relationshipRating(room, me.countryCode, countryCode) : 50;
  const label = relationshipLabel(rating);
  const isHome = me.countryCode === countryCode;
  const myCamps = campsInCountry(me, countryCode);
  const market = isMarketAccessible(room, me, countryCode) ? listOffers(room, me, countryCode) : [];

  // Find owner player, if any.
  const owner = Object.values(room.players).find(
    (p) => p.countryCode === countryCode || p.territories.includes(countryCode)
  );

  async function deployCamp() {
    const gate = canDeployCampIn(room, me, countryCode!);
    if (!gate.ok) return;
    setBusy(true);
    try {
      const camp = makeCamp(countryCode!, day);
      await patchPlayer(room.id, me.uid, {
        money: me.money - CAMP_COST,
        camps: [...me.camps, camp],
      });
      await postNews(room.id, {
        authorId: me.uid,
        authorName: me.name,
        authorCountry: me.countryCode,
        day,
        kind: 'camp',
        title: `${me.name} deploys a camp in ${country.name}`,
        body: `An army camp is now hosted in ${country.name} — projecting force into the region.`,
        meta: { hostCountry: countryCode! },
      });
    } finally {
      setBusy(false);
    }
  }

  async function buyFromMarket(unitKey: keyof PlayerState['army'], price: number) {
    if (me.money < price) return;
    setBusy(true);
    try {
      const batch = UNIT_BY_KEY[unitKey].batchSize;
      const nextArmy = { ...me.army, [unitKey]: me.army[unitKey] + batch };
      await patchPlayer(room.id, me.uid, {
        money: me.money - price,
        army: nextArmy,
      });
    } finally {
      setBusy(false);
    }
  }

  const ratingColor = label === 'friendly' ? '#22c55e' : label === 'enemy' ? '#ef4444' : '#94a3b8';

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="panel w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-3 border-b border-border bg-panel2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-panel border border-border flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{country.name}{isHome && <span className="text-muted text-xs ml-1">(home)</span>}</div>
              <div className="text-xs text-muted truncate">
                {country.region} · {country.pop.toLocaleString()}M pop {country.nukes ? `· ☢️ ${country.nukes}` : ''}
              </div>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-panel" onClick={onClose}><X className="w-5 h-5" /></button>
        </header>

        <div className="p-3 border-b border-border">
          {isHome ? (
            <div className="text-xs uppercase tracking-wider text-muted">Your home nation</div>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-muted">Relationship rating</span>
                <span className="text-xs uppercase font-semibold" style={{ color: ratingColor }}>{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 stat-bar"><div className="h-full" style={{ width: `${rating}%`, background: ratingColor }} /></div>
                <span className="font-mono text-sm" style={{ color: ratingColor }}>{Math.round(rating)}</span>
              </div>
              <div className="text-xs text-muted mt-1">&gt;75 friendly · 40–75 neutral · &lt;40 enemy</div>
              {owner && owner.uid !== me.uid && (
                <div className="mt-2 text-sm">
                  Controlled by <span className="font-semibold">{owner.name}</span>
                  {owner.allianceId && room.alliances[owner.allianceId] ? <> · {room.alliances[owner.allianceId].name}</> : null}
                </div>
              )}
            </>
          )}
        </div>

        {!isHome && (
          <nav className="flex border-b border-border bg-panel">
            <TabBtn label="Info" active={tab === 'info'} onClick={() => setTab('info')} icon={<MapPin className="w-3.5 h-3.5" />} />
            <TabBtn label={`Camps · ${myCamps.length}`} active={tab === 'camps'} onClick={() => setTab('camps')} icon={<Shield className="w-3.5 h-3.5" />} disabled={label !== 'friendly'} />
            <TabBtn label="Market" active={tab === 'market'} onClick={() => setTab('market')} icon={<ShoppingCart className="w-3.5 h-3.5" />} disabled={market.length === 0} />
          </nav>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
          {tab === 'info' && (
            <InfoPanel country={country} room={room} me={me} onAttack={onAttack} />
          )}
          {tab === 'camps' && (
            <CampsPanel country={country} room={room} me={me} camps={myCamps} onDeploy={deployCamp} busy={busy} />
          )}
          {tab === 'market' && (
            <MarketPanel offers={market} me={me} onBuy={buyFromMarket} busy={busy} />
          )}
        </div>

        {!isHome && onAttack && label !== 'friendly' && (
          <div className="p-3 border-t border-border">
            <button className="btn-danger w-full" onClick={() => { onAttack(countryCode); onClose(); }}>
              <Crosshair className="w-4 h-4" />
              Plan attack on {country.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick, icon, disabled }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs disabled:opacity-30 ${active ? 'text-accent border-b-2 border-accent' : 'text-muted border-b-2 border-transparent'}`}
    >
      {icon}{label}
    </button>
  );
}

function InfoPanel({ country }: { country: CountryDef; room: RoomState; me: PlayerState; onAttack?: (c: string) => void }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Region" value={country.region} />
        <Stat label="Population" value={`${country.pop.toLocaleString()}M`} />
        <Stat label="Borders" value={country.borders.length ? country.borders.join(', ') : 'Coastal / island'} />
        <Stat label="Nuclear" value={country.nukes ? `${country.nukes} warheads` : 'Non-nuclear'} />
      </div>
      {country.blocs.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Blocs</div>
          <div className="flex flex-wrap gap-1">
            {country.blocs.map((b) => <span key={b} className="chip bg-panel2 border border-border">{b}</span>)}
          </div>
        </div>
      )}
      {country.allies.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Hard-ally signal</div>
          <div className="text-xs text-good">{country.allies.join(' · ')}</div>
        </div>
      )}
      {country.rivals.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-1">Hard-rival signal</div>
          <div className="text-xs text-bad">{country.rivals.join(' · ')}</div>
        </div>
      )}
    </div>
  );
}

function CampsPanel({ country, room, me, camps, onDeploy, busy }: { country: CountryDef; room: RoomState; me: PlayerState; camps: import('@/types').ArmyCamp[]; onDeploy: () => void; busy: boolean }) {
  const gate = canDeployCampIn(room, me, country.code);
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted">
        You can host up to {MAX_CAMPS_PER_COUNTRY} camps in friendly nations. Each camp has 2,000 HP and lets you launch ground attacks into neighbouring countries.
      </div>
      <button className="btn-primary w-full" onClick={onDeploy} disabled={!gate.ok || busy}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
        Deploy camp · ${CAMP_COST}M
      </button>
      {!gate.ok && gate.reason && <div className="text-xs text-warn">{gate.reason}</div>}

      <div className="text-xs uppercase tracking-wider text-muted">Your camps here ({camps.length}/{MAX_CAMPS_PER_COUNTRY})</div>
      {camps.length === 0 ? (
        <div className="text-xs text-muted">No camps yet.</div>
      ) : (
        <ul className="space-y-2">
          {camps.map((c) => (
            <li key={c.id} className="panel-2 p-2 text-xs">
              <div className="flex items-baseline justify-between mb-1">
                <span>Camp #{c.id.slice(0, 4)} · Day {c.createdDay}</span>
                <span className="font-mono">{c.hp}/{c.maxHp} HP</span>
              </div>
              <div className="stat-bar"><div className="h-full bg-good" style={{ width: `${(c.hp / c.maxHp) * 100}%` }} /></div>
              <div className="text-muted mt-1">
                Garrison — Infantry {c.garrison.infantry} · Tanks {c.garrison.tanks} · Fighters {c.garrison.fighters}
                {c.hasAirstrip && <span className="text-good"> · ✈ Airstrip</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="text-xs text-muted">Garrison management UI for camp units lives in the Build tab.</div>
    </div>
  );
}

function MarketPanel({ offers, me, onBuy, busy }: { offers: ReturnType<typeof listOffers>; me: PlayerState; onBuy: (k: keyof PlayerState['army'], p: number) => void; busy: boolean }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted mb-2">
        Friendly arms exporters. Specialty items are highlighted — your Diplomat perk and the friendly relationship stack discounts.
      </div>
      {offers.map((o) => {
        const afford = me.money >= o.finalPrice;
        return (
          <button
            key={o.unit.key}
            disabled={!afford || busy}
            onClick={() => onBuy(o.unit.key, o.finalPrice)}
            className={`w-full panel-2 p-3 text-left border ${o.specialty ? 'border-warn' : 'border-border'} hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">{o.unit.emoji} {o.unit.label}{o.specialty && <span className="text-warn text-xs ml-1">★ specialty</span>}</span>
              <span className="font-mono text-xs">
                <span className="text-good">-{o.discountPct}%</span> <span className="text-warn ml-1">${o.finalPrice}M</span>
              </span>
            </div>
            {o.unit.description && <div className="text-xs text-muted mt-1">{o.unit.description}</div>}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 p-2">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
