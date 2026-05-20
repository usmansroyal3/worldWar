import { useState } from 'react';
import { Megaphone, Map as MapIcon, Newspaper, Swords, Hammer, Trophy } from 'lucide-react';
import { useGameClock } from '@/hooks/useGameClock';
import { useNews } from '@/hooks/useRoom';
import { formatCountdown } from '@/game/timer';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { WorldMap } from './WorldMap';
import { StatBar } from './StatBar';
import { SpeechModal } from './SpeechModal';
import { NewsFeed } from './NewsFeed';
import { PrepPanel } from './PrepPanel';
import { WarPanel } from './WarPanel';
import { Standings } from './Standings';
import type { PlayerState, RoomState } from '@/types';

type Tab = 'map' | 'build' | 'news' | 'strike' | 'standings';

export function GameView({ room, me }: { room: RoomState; me: PlayerState }) {
  const clock = useGameClock(room);
  const news = useNews(room.id);
  const [tab, setTab] = useState<Tab>('map');
  const [speech, setSpeech] = useState(false);

  if (!clock) {
    return <div className="p-6 text-muted">Loading game clock...</div>;
  }

  const myCountry = me.countryCode ? COUNTRY_BY_CODE[me.countryCode] : null;
  const phaseLabel = clock.phase === 'preparation' ? 'Preparation' : clock.phase === 'war' ? 'War' : 'Ended';
  const phaseDay = clock.phase === 'preparation'
    ? `${clock.day} / ${clock.prepDays}`
    : clock.phase === 'war'
      ? `${clock.day - clock.prepDays} / ${clock.warDays}`
      : 'Final';

  // Switch to war tab on day after prep ends; do not force back later.
  const tabs: { id: Tab; icon: React.ReactNode; label: string; disabled?: boolean }[] = [
    { id: 'map', icon: <MapIcon className="w-4 h-4" />, label: 'World' },
    { id: 'build', icon: <Hammer className="w-4 h-4" />, label: 'Build' },
    { id: 'strike', icon: <Swords className="w-4 h-4" />, label: 'War', disabled: clock.phase !== 'war' },
    { id: 'news', icon: <Newspaper className="w-4 h-4" />, label: 'News' },
    { id: 'standings', icon: <Trophy className="w-4 h-4" />, label: 'Standings' },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg">
      <header className="px-3 py-2 border-b border-border bg-panel">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted">{phaseLabel} · Day {phaseDay}</div>
            <div className="font-semibold truncate">
              {myCountry ? `${myCountry.name}` : 'No country'} · {me.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted">Next day in</div>
            <div className="font-mono text-sm">{formatCountdown(clock.msUntilNextDay)}</div>
          </div>
          <button className="btn-primary text-sm" onClick={() => setSpeech(true)}>
            <Megaphone className="w-4 h-4" />
            Speech
          </button>
        </div>
        <div className="mt-2"><StatBar me={me} /></div>
      </header>

      <nav className="border-b border-border bg-panel">
        <div className="flex overflow-x-auto scrollbar-thin">
          {tabs.map((t) => (
            <button
              key={t.id}
              disabled={t.disabled}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[70px] flex flex-col items-center gap-0.5 py-2 text-xs disabled:opacity-30 ${
                tab === t.id ? 'text-accent border-b-2 border-accent' : 'text-muted border-b-2 border-transparent'
              }`}
            >
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {tab === 'map' && (
          <div className="h-full min-h-[400px]">
            <WorldMap room={room} viewerCountryCode={me.countryCode} highlightMode="relationship" />
          </div>
        )}
        {tab === 'build' && (
          <div className="p-3 space-y-3">
            <PrepPanel room={room} me={me} day={clock.day} />
            <div className="panel p-3 text-xs text-muted">
              Tip: announcing builds in the news lets others "inspire" themselves for +1 morale,
              earning you +2 reputation. Staying silent hides your capacity but loses that bonus.
            </div>
          </div>
        )}
        {tab === 'strike' && (
          <div className="p-3 space-y-3">
            {clock.phase === 'war' ? (
              <WarPanel room={room} me={me} day={clock.day} />
            ) : (
              <div className="panel p-6 text-center text-muted">
                The world is at peace... for now. Attacks unlock on Day {clock.prepDays + 1}.
              </div>
            )}
          </div>
        )}
        {tab === 'news' && (
          <div className="p-3">
            <NewsFeed room={room} me={me} news={news} />
          </div>
        )}
        {tab === 'standings' && (
          <div className="p-3">
            <Standings room={room} />
          </div>
        )}
      </main>

      <SpeechModal open={speech} onClose={() => setSpeech(false)} room={room} me={me} day={clock.day} />
    </div>
  );
}
