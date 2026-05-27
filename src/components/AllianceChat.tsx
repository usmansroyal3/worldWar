import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2, Shield } from 'lucide-react';
import { sendChat, watchChat, type ChatMessage } from '@/firebase/chat';
import { sfx } from '@/lib/sound';
import type { PlayerState, RoomState } from '@/types';

interface Props {
  room: RoomState;
  me: PlayerState;
}

export function AllianceChat({ room, me }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const alliance = me.allianceId ? room.alliances[me.allianceId] : null;

  useEffect(() => {
    if (!alliance) return;
    const unsub = watchChat(room.id, alliance.id, setMessages);
    return unsub;
  }, [room.id, alliance?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!alliance) {
    return (
      <div className="panel p-6 text-center text-muted">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">Join or create an alliance in the lobby to unlock private chat.</div>
      </div>
    );
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    sfx.click();
    try {
      await sendChat(room.id, alliance!.id, me.uid, me.name, text);
      setDraft('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel flex flex-col h-[60vh] max-h-[600px]">
      <header className="p-3 border-b border-border flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-accent" />
        <div>
          <div className="font-semibold text-sm">{alliance.name}</div>
          <div className="text-xs text-muted">{alliance.memberIds.length} member{alliance.memberIds.length === 1 ? '' : 's'} · private channel</div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-xs text-muted py-6">No messages yet. Coordinate with your allies.</div>
        )}
        {messages.map((m) => {
          const mine = m.authorId === me.uid;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] panel-2 px-3 py-1.5 text-sm ${mine ? 'bg-accent/20 border-accent/30' : ''}`}>
                {!mine && <div className="text-[10px] text-muted">{m.authorName}</div>}
                <div className="break-words">{m.body}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input
          className="input flex-1"
          placeholder="Message your alliance..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          maxLength={500}
        />
        <button className="btn-primary" disabled={busy || !draft.trim()} onClick={send}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
