import { useState } from 'react';
import { ShoppingCart, Loader2, ChevronRight } from 'lucide-react';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { listSellers, listOffers } from '@/game/market';
import { UNIT_BY_KEY } from '@/game/army';
import { patchPlayer } from '@/firebase/rooms';
import type { ArmyState, PlayerState, RoomState } from '@/types';

interface Props {
  room: RoomState;
  me: PlayerState;
}

export function MarketView({ room, me }: Props) {
  const sellers = listSellers(room, me);
  const [seller, setSeller] = useState<string | null>(sellers[0] ?? null);
  const [busy, setBusy] = useState(false);

  if (sellers.length === 0) {
    return (
      <div className="panel p-6 text-center text-muted">
        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">No friendly arms exporters available yet. Improve diplomatic ties to unlock the market.</div>
      </div>
    );
  }

  const offers = seller ? listOffers(room, me, seller) : [];

  async function buy(unitKey: keyof ArmyState, price: number) {
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

  return (
    <div className="grid sm:grid-cols-[200px_1fr] gap-3">
      <aside className="panel p-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
        <div className="text-xs uppercase tracking-wider text-muted px-2 py-1">Friendly arms exporters</div>
        {sellers.map((code) => {
          const c = COUNTRY_BY_CODE[code];
          const active = seller === code;
          return (
            <button
              key={code}
              onClick={() => setSeller(code)}
              className={`w-full text-left px-2 py-2 rounded-lg flex items-center justify-between hover:bg-panel2 ${active ? 'bg-panel2' : ''}`}
            >
              <span className="text-sm truncate">{c.name}{c.nukes ? <span className="text-xs text-muted ml-1">☢️</span> : ''}</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
            </button>
          );
        })}
      </aside>

      <section>
        {seller && (
          <div className="panel p-3 mb-2 flex items-center justify-between">
            <div>
              <div className="font-semibold">{COUNTRY_BY_CODE[seller].name} arms market</div>
              <div className="text-xs text-muted">Discount stacks: friendly relation + specialty + Diplomat perk if applicable.</div>
            </div>
            <ShoppingCart className="w-5 h-5 text-accent" />
          </div>
        )}
        <ul className="space-y-2">
          {offers.map((o) => {
            const afford = me.money >= o.finalPrice;
            return (
              <li key={o.unit.key}>
                <button
                  className={`w-full panel-2 p-3 text-left border ${o.specialty ? 'border-warn' : 'border-border'} hover:border-accent disabled:opacity-50`}
                  disabled={!afford || busy}
                  onClick={() => buy(o.unit.key, o.finalPrice)}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{o.unit.emoji} {o.unit.label}{o.specialty && <span className="text-warn text-xs ml-2">★ specialty</span>}</span>
                    <span className="font-mono text-sm">
                      <span className="text-good text-xs">-{o.discountPct}%</span>{' '}
                      <span className="text-warn">${o.finalPrice}M</span>
                    </span>
                  </div>
                  {o.unit.description && <div className="text-xs text-muted mt-1">{o.unit.description}</div>}
                  <div className="text-xs text-muted mt-1">
                    You own: <span className="font-mono">{me.army[o.unit.key].toLocaleString()}</span>
                    {o.unit.batchSize > 1 && <span className="ml-2">· +{o.unit.batchSize.toLocaleString()} per buy</span>}
                  </div>
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin mt-1" />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
