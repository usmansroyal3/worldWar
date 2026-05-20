import { Newspaper, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { NewsItem, PlayerState, RoomState } from '@/types';
import { inspireNews, patchPlayer } from '@/firebase/rooms';
import { INSPIRE_BONUS } from '@/game/speech';
import { COUNTRY_BY_CODE } from '@/data/countries';

interface Props {
  room: RoomState;
  me: PlayerState;
  news: NewsItem[];
}

export function NewsFeed({ room, me, news }: Props) {
  if (news.length === 0) {
    return (
      <div className="panel p-6 text-center text-muted">
        <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-sm">No news yet. Make a speech or build something.</div>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {news.map((item) => (
        <NewsRow key={item.id} item={item} room={room} me={me} />
      ))}
    </ul>
  );
}

function NewsRow({ item, room, me }: { item: NewsItem; room: RoomState; me: PlayerState }) {
  const [busy, setBusy] = useState(false);
  const country = item.authorCountry ? COUNTRY_BY_CODE[item.authorCountry] : null;
  const isMine = item.authorId === me.uid;
  const alreadyInspired = item.inspiredBy?.includes(me.uid);
  const canInspire = !isMine && !alreadyInspired && item.kind === 'speech';

  async function inspire() {
    if (!canInspire) return;
    setBusy(true);
    try {
      await inspireNews(room.id, item.id, me.uid);
      const author = room.players[item.authorId];
      // Reader gains morale, author gains reputation.
      const tasks: Promise<void>[] = [
        patchPlayer(room.id, me.uid, {
          morale: Math.max(0, Math.min(100, me.morale + INSPIRE_BONUS.reader_morale)),
        }),
      ];
      if (author) {
        tasks.push(
          patchPlayer(room.id, author.uid, {
            reputation: Math.max(0, Math.min(100, author.reputation + INSPIRE_BONUS.author_reputation)),
          })
        );
      }
      await Promise.all(tasks);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="panel-2 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted">Day {item.day} · {item.authorName}{country ? ` · ${country.name}` : ''}</span>
        <span className="chip bg-panel border border-border text-muted capitalize">{item.kind}</span>
      </div>
      <div className="font-semibold text-sm mb-1">{item.title}</div>
      <div className="text-sm text-muted mb-2">{item.body}</div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted">
          {item.inspiredBy && item.inspiredBy.length > 0 ? `${item.inspiredBy.length} inspired` : ''}
        </div>
        {canInspire && (
          <button className="btn-secondary text-xs" onClick={inspire} disabled={busy}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-warn" />}
            Inspire (+1 morale)
          </button>
        )}
        {alreadyInspired && !isMine && (
          <span className="text-xs text-good">Inspired ✓</span>
        )}
      </div>
    </li>
  );
}
