import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { SPEECH_OPTIONS, applySpeech } from '@/game/speech';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { patchPlayer, postNews } from '@/firebase/rooms';
import type { PlayerState, RoomState, SpeechKind } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  me: PlayerState;
  day: number;
}

export function SpeechModal({ open, onClose, room, me, day }: Props) {
  const [selected, setSelected] = useState<SpeechKind | null>(null);
  const [publish, setPublish] = useState(true);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const used = me.daily.speechUsed && me.daily.lastResetDay === day;

  async function deliver() {
    if (!selected) return;
    setBusy(true);
    try {
      const fx = applySpeech(me, selected);
      await patchPlayer(room.id, me.uid, {
        morale: Math.max(0, Math.min(100, me.morale + fx.morale)),
        reputation: Math.max(0, Math.min(100, me.reputation + fx.reputation)),
        daily: { speechUsed: true, lastResetDay: day },
      });
      if (publish) {
        await postNews(room.id, {
          authorId: me.uid,
          authorName: me.name,
          authorCountry: me.countryCode,
          day,
          kind: 'speech',
          title: fx.title,
          body: fx.body,
          inspiredBy: [],
          meta: { speech: selected },
        });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3">
      <div className="panel w-full max-w-md p-4 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Daily speech</h3>
          <button className="p-1 rounded-lg hover:bg-panel2" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {used ? (
          <div className="text-sm text-muted">You've already given today's speech. One free address per day.</div>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {(Object.keys(SPEECH_OPTIONS) as SpeechKind[]).map((kind) => {
                const opt = SPEECH_OPTIONS[kind];
                const isSel = selected === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => setSelected(kind)}
                    className={`w-full text-left panel-2 p-3 border ${isSel ? 'border-accent' : 'border-border'} hover:border-accent transition-colors`}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-semibold">{opt.emoji} {opt.label}</span>
                    </div>
                    <div className="text-xs text-muted">{opt.description}</div>
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="accent-accent" />
              <span>Publish to news feed</span>
              <span className="text-xs text-muted">(silent = stealthier, no inspire bonus)</span>
            </label>

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn-primary flex-1" onClick={deliver} disabled={!selected || busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Deliver
              </button>
            </div>
            {me.countryCode && (
              <div className="text-xs text-muted mt-3">
                As leader of {COUNTRY_BY_CODE[me.countryCode]?.name}.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
