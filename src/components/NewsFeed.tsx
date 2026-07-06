import { Newspaper, Sparkles, Loader2, Heart } from 'lucide-react';
import { useState } from 'react';
import type { NewsItem, NewsKind, PlayerState, RoomState } from '@/types';
import { inspireNews, patchPlayer } from '@/firebase/rooms';
import { INSPIRE_BONUS } from '@/game/speech';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { flagEmoji } from '@/lib/flags';
import { sfx } from '@/lib/sound';

interface Props {
  room: RoomState;
  me: PlayerState;
  news: NewsItem[];
}

// Visual identity per news kind: gradient backdrop + hero emoji, giving each
// card an Instagram-post-style "image" without shipping image assets.
const KIND_VISUAL: Record<NewsKind, { gradient: string; emoji: string; label: string }> = {
  attack:      { gradient: 'from-red-900 via-red-800 to-orange-800',      emoji: '⚔️', label: 'Strike' },
  nuke:        { gradient: 'from-amber-600 via-orange-800 to-red-950',    emoji: '☢️', label: 'Nuclear' },
  intercept:   { gradient: 'from-sky-800 via-blue-900 to-slate-900',      emoji: '🛡️', label: 'Intercept' },
  speech:      { gradient: 'from-blue-900 via-indigo-800 to-violet-800',  emoji: '🎙️', label: 'Address' },
  build:       { gradient: 'from-slate-800 via-cyan-900 to-slate-900',    emoji: '🏗️', label: 'Build-up' },
  event:       { gradient: 'from-emerald-900 via-teal-800 to-emerald-950',emoji: '🌐', label: 'World News' },
  capture:     { gradient: 'from-yellow-700 via-amber-800 to-red-900',    emoji: '🏴', label: 'Conquest' },
  declaration: { gradient: 'from-indigo-900 via-slate-800 to-slate-900',  emoji: '📜', label: 'Declaration' },
  alliance:    { gradient: 'from-violet-800 via-purple-800 to-fuchsia-900', emoji: '🤝', label: 'Alliance' },
  advance:     { gradient: 'from-teal-800 via-cyan-800 to-sky-900',       emoji: '🕊️', label: 'Diplomacy' },
  camp:        { gradient: 'from-lime-900 via-emerald-800 to-green-950',  emoji: '🏕️', label: 'Deployment' },
  system:      { gradient: 'from-slate-800 via-slate-700 to-slate-900',   emoji: '⚙️', label: 'Bulletin' },
  digest:      { gradient: 'from-slate-800 via-zinc-800 to-neutral-900',  emoji: '🗓️', label: 'Daily Digest' },
};

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
    <div className="max-w-md mx-auto space-y-4">
      {news.map((item) => (
        <NewsCard key={item.id} item={item} room={room} me={me} />
      ))}
    </div>
  );
}

function NewsCard({ item, room, me }: { item: NewsItem; room: RoomState; me: PlayerState }) {
  const [busy, setBusy] = useState(false);
  const visual = KIND_VISUAL[item.kind] ?? KIND_VISUAL.system;
  const country = item.authorCountry ? COUNTRY_BY_CODE[item.authorCountry] : null;
  const isMine = item.authorId === me.uid;
  const isSystem = item.authorId === 'system';
  const alreadyInspired = item.inspiredBy?.includes(me.uid);
  const canInspire = !isMine && !isSystem && !alreadyInspired && item.kind === 'speech';
  const inspireCount = item.inspiredBy?.length ?? 0;

  // Route flags for attack-style posts make the "image" tell the story.
  const routeFrom = item.meta?.routeFrom as string | undefined;
  const routeTo = item.meta?.routeTo as string | undefined;
  const dmg = item.meta?.dmg as number | undefined;

  async function inspire() {
    if (!canInspire) return;
    setBusy(true);
    sfx.notify();
    try {
      await inspireNews(room.id, item.id, me.uid);
      const author = room.players[item.authorId];
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
    <article className="panel overflow-hidden">
      {/* Author row */}
      <header className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-9 h-9 rounded-full bg-panel2 border border-border flex items-center justify-center text-lg shrink-0">
          {isSystem ? '🌐' : flagEmoji(item.authorCountry)}
        </div>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-semibold text-sm truncate">
            {item.authorName}
            {isMine && <span className="text-muted font-normal text-xs"> (you)</span>}
          </div>
          <div className="text-xs text-muted truncate">
            {country ? `${country.name} · ` : ''}Day {item.day}
          </div>
        </div>
        <span className="chip bg-panel2 border border-border text-muted shrink-0">{visual.label}</span>
      </header>

      {/* Visual area — the "image" */}
      <div className={`relative bg-gradient-to-br ${visual.gradient} aspect-[16/9] flex items-center justify-center overflow-hidden`}>
        <span className="absolute text-[120px] opacity-15 select-none" aria-hidden>{visual.emoji}</span>
        <div className="relative z-10 text-center px-4">
          {routeFrom && routeTo ? (
            <div className="flex items-center justify-center gap-3 text-4xl mb-2">
              <span>{flagEmoji(routeFrom)}</span>
              <span className="text-2xl">{item.kind === 'intercept' ? '🛡️' : '➡️'}</span>
              <span>{flagEmoji(routeTo)}</span>
            </div>
          ) : (
            <div className="text-5xl mb-2">{visual.emoji}</div>
          )}
          <div className="font-bold text-base text-white drop-shadow-lg leading-snug">{item.title}</div>
          {dmg != null && dmg > 0 && (
            <div className="font-mono text-sm text-amber-300 drop-shadow mt-1">💥 {dmg.toLocaleString()} damage</div>
          )}
        </div>
      </div>

      {/* Action + caption */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-3 mb-1.5">
          {canInspire ? (
            <button
              className="flex items-center gap-1.5 text-sm text-muted hover:text-warn transition-colors disabled:opacity-50"
              onClick={inspire}
              disabled={busy}
            >
              {busy
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Sparkles className="w-5 h-5" />}
              Inspire <span className="text-xs">(+1 morale)</span>
            </button>
          ) : (
            <span className={`flex items-center gap-1.5 text-sm ${alreadyInspired ? 'text-warn' : 'text-muted'}`}>
              <Heart className={`w-5 h-5 ${alreadyInspired ? 'fill-current' : ''}`} />
              {alreadyInspired ? 'Inspired' : ''}
            </span>
          )}
          {inspireCount > 0 && (
            <span className="text-xs text-muted ml-auto">
              {inspireCount} {inspireCount === 1 ? 'nation' : 'nations'} inspired
            </span>
          )}
        </div>
        {item.body && <p className="text-sm text-muted leading-snug">{item.body}</p>}
      </div>
    </article>
  );
}
