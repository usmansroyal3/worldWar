import { useEffect, useState } from 'react';
import { Swords, Skull, Shield } from 'lucide-react';
import { COUNTRY_BY_CODE } from '@/data/countries';
import type { NewsItem } from '@/types';

interface Toast {
  id: string;
  kind: 'attack' | 'nuke' | 'intercept';
  title: string;
  detail: string;
  expiresAt: number;
}

const TOAST_MS = 9_000;

// Surface attack events as bottom-of-screen banners so the player notices
// every battle even if they're scrolled away from the impact site on the
// world map.
export function BattleToasts({ news, myUid }: { news: NewsItem[]; myUid: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Watch news and queue toasts for fresh attack/nuke/intercept events.
  useEffect(() => {
    const now = Date.now();
    const seen = new Set(toasts.map((t) => t.id));
    const additions: Toast[] = [];

    for (const n of news) {
      if (seen.has(n.id)) continue;
      if (n.kind !== 'attack' && n.kind !== 'nuke' && n.kind !== 'intercept') continue;
      const age = now - n.createdAt;
      if (age > 5_000) continue;
      const from = n.meta?.routeFrom as string | undefined;
      const to = n.meta?.routeTo as string | undefined;
      if (!from || !to) continue;
      const fromName = COUNTRY_BY_CODE[from]?.name ?? from;
      const toName = COUNTRY_BY_CODE[to]?.name ?? to;
      const dmg = (n.meta?.dmg as number | undefined) ?? 0;
      const intercepted = !!n.meta?.intercepted;
      const youAreAttacker = n.authorId === myUid;
      const kind: Toast['kind'] = n.kind === 'nuke' ? 'nuke' : intercepted ? 'intercept' : 'attack';

      additions.push({
        id: n.id,
        kind,
        title:
          kind === 'nuke'
            ? `☢️ NUCLEAR STRIKE`
            : kind === 'intercept'
            ? `🛡️ Missile intercepted`
            : youAreAttacker
            ? `⚔️ Your strike on ${toName}`
            : `⚔️ Strike on ${toName}`,
        detail: `${fromName} → ${toName} · ${dmg.toLocaleString()} dmg`,
        expiresAt: now + TOAST_MS,
      });
    }

    if (additions.length > 0) {
      setToasts((prev) => [...prev, ...additions].slice(-3));
    }
  }, [news, myUid]);

  // Expire toasts that have aged out
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setInterval(() => {
      setToasts((prev) => prev.filter((t) => t.expiresAt > Date.now()));
    }, 500);
    return () => clearInterval(id);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-3 z-[900] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`panel-2 px-3 py-2 flex items-center gap-2 shadow-xl border ${
            t.kind === 'nuke' ? 'border-warn' : t.kind === 'intercept' ? 'border-accent' : 'border-bad'
          } animate-fade-in`}
          style={{ minWidth: 240 }}
        >
          {t.kind === 'nuke' ? (
            <Skull className="w-4 h-4 text-warn shrink-0" />
          ) : t.kind === 'intercept' ? (
            <Shield className="w-4 h-4 text-accent shrink-0" />
          ) : (
            <Swords className="w-4 h-4 text-bad shrink-0" />
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight">{t.title}</div>
            <div className="text-xs text-muted leading-tight">{t.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
