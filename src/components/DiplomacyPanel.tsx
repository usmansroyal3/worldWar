import { useState } from 'react';
import { Handshake, Loader2, Swords } from 'lucide-react';
import { getStatus, CEASEFIRE_BREAK_PENALTY } from '@/game/diplomacy2';
import { declareDiplomacy, patchPlayer, postNews } from '@/firebase/rooms';
import { sfx } from '@/lib/sound';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { PlayerState, RoomState } from '@/types';

interface Props {
  room: RoomState;
  me: PlayerState;
  other: PlayerState;
  day: number;
}

export function DiplomacyPanel({ room, me, other, day }: Props) {
  const [busy, setBusy] = useState(false);
  const status = getStatus(room, me.uid, other.uid);
  // Same alliance? No diplomatic UI — you're already allies.
  if (me.allianceId && me.allianceId === other.allianceId) {
    return (
      <div className="panel-2 p-3 text-xs text-good">
        Allied via {room.alliances[me.allianceId]?.name ?? 'shared pact'}.
      </div>
    );
  }

  async function setStatusTo(s: 'war' | 'ceasefire' | 'peace') {
    setBusy(true);
    sfx.click();
    try {
      let repDelta = 0;
      let title = '';
      if (s === 'war') {
        title = `${me.name} declares war on ${other.name}`;
      } else if (s === 'ceasefire') {
        title = `${me.name} proposes ceasefire with ${other.name}`;
      } else {
        // peace from war = breaking ceasefire is illegal; from ceasefire = normal end
        if (status === 'ceasefire') repDelta = -CEASEFIRE_BREAK_PENALTY;
        title = `${me.name} ends hostilities with ${other.name}`;
      }
      await declareDiplomacy(room.id, me.uid, other.uid, s);
      if (repDelta !== 0) {
        await patchPlayer(room.id, me.uid, {
          reputation: Math.max(0, Math.round(me.reputation + repDelta)),
        });
      }
      await postNews(room.id, {
        authorId: me.uid,
        authorName: me.name,
        authorCountry: me.countryCode,
        day,
        kind: 'declaration',
        title,
        body: `${COUNTRY_BY_CODE[me.countryCode ?? '']?.name ?? me.name} ${
          s === 'war' ? 'declares war on' : s === 'ceasefire' ? 'offers a ceasefire to' : 'restores peace with'
        } ${COUNTRY_BY_CODE[other.countryCode ?? '']?.name ?? other.name}.`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-2 p-3">
      <div className="text-xs uppercase tracking-wider text-muted mb-1">Diplomatic status</div>
      <div className="flex items-center gap-2 mb-3">
        {status === 'war' ? <Swords className="w-4 h-4 text-bad" /> : <Handshake className="w-4 h-4 text-good" />}
        <span className={`font-semibold capitalize ${status === 'war' ? 'text-bad' : status === 'ceasefire' ? 'text-warn' : 'text-good'}`}>
          {status}
        </span>
      </div>
      <div className="flex gap-2">
        {status !== 'war' && (
          <button className="btn-danger flex-1 text-xs" onClick={() => setStatusTo('war')} disabled={busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Swords className="w-3.5 h-3.5" />}
            Declare War
          </button>
        )}
        {status === 'war' && (
          <button className="btn-secondary flex-1 text-xs" onClick={() => setStatusTo('ceasefire')} disabled={busy}>
            <Handshake className="w-3.5 h-3.5" /> Offer Ceasefire
          </button>
        )}
        {status === 'ceasefire' && (
          <button className="btn-secondary flex-1 text-xs" onClick={() => setStatusTo('peace')} disabled={busy}>
            End ceasefire (-{CEASEFIRE_BREAK_PENALTY} rep)
          </button>
        )}
        {status === 'peace' && (
          <span className="text-xs text-muted">Peace held. Striking now will burn reputation.</span>
        )}
      </div>
    </div>
  );
}
