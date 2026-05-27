import { Trophy, Shield, Heart } from 'lucide-react';
import { computeStandings } from '@/game/scoring';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { PlayerState, RoomState } from '@/types';

export function Standings({ room }: { room: RoomState }) {
  const standings = computeStandings(room);
  return (
    <div className="space-y-3">
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-warn" />
          <h3 className="font-semibold">Standings (population points)</h3>
        </div>
        <ul className="space-y-2">
          {standings.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 panel-2 p-2">
              <span className="w-6 text-center font-mono text-sm text-muted">#{i + 1}</span>
              {s.kind === 'alliance' ? <Shield className="w-4 h-4 text-accent" /> : null}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-[10px] text-muted">
                  {s.capitalsAlive}/{s.members.length} capital{s.members.length === 1 ? '' : 's'} alive
                </div>
              </div>
              <span className="font-mono text-warn">{s.popScore.toFixed(0)}M</span>
            </li>
          ))}
        </ul>
        <div className="text-xs text-muted mt-2">Winner is the highest population-points controller when the war ends, or the last alliance with a surviving capital.</div>
      </div>

      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-bad" />
          <h3 className="font-semibold">Capital damage tracker</h3>
        </div>
        <ul className="space-y-2">
          {Object.values(room.players)
            .filter((p) => p.countryCode)
            .sort((a, b) => b.capital.hp - a.capital.hp)
            .map((p) => (
              <PlayerHpRow key={p.uid} player={p} alliance={p.allianceId ? room.alliances[p.allianceId]?.name : undefined} />
            ))}
        </ul>
        <div className="text-xs text-muted mt-2">
          Each capital starts at 10,000 HP. A player is eliminated when their capital reaches zero.
        </div>
      </div>
    </div>
  );
}

function PlayerHpRow({ player, alliance }: { player: PlayerState; alliance?: string }) {
  const country = COUNTRY_BY_CODE[player.countryCode!];
  const pct = Math.max(0, Math.min(100, (player.capital.hp / player.capital.maxHp) * 100));
  const color = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  const eliminated = player.capital.hp <= 0;
  return (
    <li className="panel-2 p-2">
      <div className="flex items-baseline justify-between mb-1">
        <div className="min-w-0">
          <span className="font-medium truncate">{player.name}</span>
          <span className="text-xs text-muted ml-2">{country?.name ?? player.countryCode}</span>
          {alliance && <span className="text-xs text-accent ml-2">· {alliance}</span>}
        </div>
        <div className="text-right">
          <div className="font-mono text-sm" style={{ color }}>
            {eliminated ? 'DOWN' : `${player.capital.hp.toLocaleString()} HP`}
          </div>
          <div className="text-[10px] text-muted">
            {eliminated ? '💀 ELIMINATED' : `${player.capital.hp.toLocaleString()} dmg to KO`}
          </div>
        </div>
      </div>
      <div className="stat-bar">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{(player.capital.maxHp - player.capital.hp).toLocaleString()} dmg taken</span>
        <span>{Math.round(pct)}%</span>
      </div>
    </li>
  );
}
