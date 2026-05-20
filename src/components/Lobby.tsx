import { useState } from 'react';
import { Crown, Check, Copy, Globe2, Shield, Loader2, Users } from 'lucide-react';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { PERKS } from '@/data/perks';
import { createAlliance, joinAlliance, leaveAlliance, patchPlayer, startGame, updateRoom } from '@/firebase/rooms';
import { initialAcceptance } from '@/game/relationships';
import type { PlayerState, RoomState } from '@/types';
import { CountryPicker } from './CountryPicker';

interface Props {
  room: RoomState;
  me: PlayerState;
  isAdmin: boolean;
}

export function Lobby({ room, me, isAdmin }: Props) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [allianceName, setAllianceName] = useState('');
  const [copied, setCopied] = useState(false);

  const everyoneReady = Object.values(room.players).every((p) => p.ready && p.countryCode);
  const playerCount = Object.keys(room.players).length;

  function shareLink() {
    const url = `${window.location.origin}/room/${room.id}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function pickCountry(code: string) {
    setPicking(false);
    setBusy(true);
    try {
      await patchPlayer(room.id, me.uid, { countryCode: code });
    } finally {
      setBusy(false);
    }
  }

  async function toggleReady() {
    if (!me.countryCode) return;
    setBusy(true);
    try {
      await patchPlayer(room.id, me.uid, { ready: !me.ready });
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    setBusy(true);
    try {
      // Seed NPC acceptance for every player's country vs every other (non-player) NPC.
      const npc: Record<string, { acceptance: number }> = {};
      const playerCodes = new Set<string>();
      Object.values(room.players).forEach((p) => { if (p.countryCode) playerCodes.add(p.countryCode); });
      // For each player country, write the acceptance map keyed by `<targetCode>__<viewerCode>`.
      Object.keys(COUNTRY_BY_CODE).forEach((targetCode) => {
        if (playerCodes.has(targetCode)) return;
        // Use the strongest viewer to seed (we store per-target average so map calc has a starting value).
        let sum = 0; let n = 0;
        playerCodes.forEach((viewer) => { sum += initialAcceptance(viewer, targetCode); n++; });
        npc[targetCode] = { acceptance: n ? Math.round(sum / n) : 50 };
      });
      await updateRoom(room.id, { npc } as unknown as Partial<RoomState>);
      await startGame(room.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAlliance() {
    const name = allianceName.trim() || `${me.name}'s Pact`;
    setBusy(true);
    try {
      await createAlliance(room.id, me.uid, name);
      setAllianceName('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="p-3 border-b border-border bg-panel flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Room code</div>
          <div className="font-mono text-xl tracking-widest">{room.id}</div>
        </div>
        <button className="btn-secondary text-sm" onClick={shareLink}>
          {copied ? <Check className="w-4 h-4 text-good" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Share link'}
        </button>
      </header>

      <div className="p-4 grid gap-4 md:grid-cols-2 max-w-5xl mx-auto w-full">
        <section className="panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-accent" />
            <h2 className="font-semibold">Players ({playerCount}/6)</h2>
          </div>
          <ul className="space-y-2">
            {Object.values(room.players)
              .sort((a, b) => a.joinedAt - b.joinedAt)
              .map((p) => (
                <PlayerCard key={p.uid} player={p} isAdmin={p.uid === room.adminId} isYou={p.uid === me.uid} />
              ))}
          </ul>
        </section>

        <section className="panel p-4">
          <h2 className="font-semibold mb-3">Your setup</h2>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Country</label>
            <button className="btn-secondary w-full justify-start" onClick={() => setPicking(true)}>
              <Globe2 className="w-4 h-4" />
              {me.countryCode ? COUNTRY_BY_CODE[me.countryCode]?.name : 'Pick a country'}
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Starting perks</label>
            <div className="grid grid-cols-1 gap-2">
              {me.perks.map((pid) => {
                const p = PERKS[pid];
                return (
                  <div key={pid} className="panel-2 p-2 flex items-start gap-2">
                    <span className="text-xl leading-none">{p.emoji}</span>
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-muted">{p.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Alliance</label>
            {me.allianceId && room.alliances[me.allianceId] ? (
              <div className="panel-2 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent" />
                  <span className="font-semibold">{room.alliances[me.allianceId].name}</span>
                  <span className="text-xs text-muted">
                    {room.alliances[me.allianceId].memberIds.length} members
                  </span>
                </div>
                <button
                  className="btn-secondary text-xs"
                  onClick={() => leaveAlliance(room.id, me.allianceId!, me.uid)}
                  disabled={busy}
                >Leave</button>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.values(room.alliances).map((a) => (
                  <div key={a.id} className="panel-2 p-2 flex items-center justify-between">
                    <span className="text-sm">{a.name} <span className="text-xs text-muted">· {a.memberIds.length}</span></span>
                    <button className="btn-secondary text-xs" onClick={() => joinAlliance(room.id, a.id, me.uid)} disabled={busy}>
                      Join
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={allianceName}
                    onChange={(e) => setAllianceName(e.target.value)}
                    placeholder="Name an alliance (or skip)"
                    className="input flex-1"
                  />
                  <button className="btn-primary" onClick={handleCreateAlliance} disabled={busy}>Create</button>
                </div>
                <div className="text-xs text-muted">You may stay solo.</div>
              </div>
            )}
          </div>

          <button
            className={me.ready ? 'btn-secondary w-full' : 'btn-primary w-full'}
            onClick={toggleReady}
            disabled={!me.countryCode || busy}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : me.ready ? <Check className="w-4 h-4" /> : null}
            {me.ready ? 'Ready ✓ (tap to unready)' : 'Mark me ready'}
          </button>
        </section>

        {isAdmin && (
          <section className="panel p-4 md:col-span-2">
            <h2 className="font-semibold mb-2 flex items-center gap-2"><Crown className="w-4 h-4 text-warn" /> You are the admin</h2>
            <div className="text-sm text-muted mb-3">
              Prep phase: <span className="text-ink">{room.prepDays} days</span> · War phase: 7 days. Start the game when all players are ready.
            </div>
            <button
              className="btn-primary"
              onClick={handleStart}
              disabled={!everyoneReady || playerCount < 2 || busy}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {everyoneReady ? 'Start game' : `Waiting for all players to be ready (${Object.values(room.players).filter(p => p.ready).length}/${playerCount})`}
            </button>
          </section>
        )}
      </div>

      <CountryPicker
        open={picking}
        onClose={() => setPicking(false)}
        room={room}
        currentCode={me.countryCode}
        onPick={pickCountry}
      />
    </div>
  );
}

function PlayerCard({ player, isAdmin, isYou }: { player: PlayerState; isAdmin: boolean; isYou: boolean }) {
  const country = player.countryCode ? COUNTRY_BY_CODE[player.countryCode] : null;
  return (
    <li className="panel-2 p-3 flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full ${player.ready ? 'bg-good' : 'bg-muted'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isAdmin && <Crown className="w-3.5 h-3.5 text-warn" />}
          <span className="font-semibold truncate">{player.name}{isYou && <span className="text-muted text-xs ml-1">(you)</span>}</span>
        </div>
        <div className="text-xs text-muted truncate">
          {country ? country.name : 'No country yet'}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs text-muted">{player.perks.length} perks</div>
      </div>
    </li>
  );
}
