import { useEffect, useState } from 'react';
import { Megaphone, Map as MapIcon, Newspaper, Swords, Hammer, Trophy, HelpCircle, ShoppingCart, Shield, FastForward, Loader2 } from 'lucide-react';
import { useGameClock } from '@/hooks/useGameClock';
import { useNews } from '@/hooks/useRoom';
import { useDailyTick } from '@/hooks/useDailyTick';
import { formatCountdown } from '@/game/timer';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { fastForwardOneDay } from '@/firebase/rooms';
import { WorldMap } from './WorldMap';
import { StatBar } from './StatBar';
import { SpeechModal } from './SpeechModal';
import { NewsFeed } from './NewsFeed';
import { PrepPanel } from './PrepPanel';
import { WarPanel } from './WarPanel';
import { Standings } from './Standings';
import { BhairavaTutorial, shouldShowTutorial } from './BhairavaTutorial';
import { CountryDetail } from './CountryDetail';
import { MarketView } from './MarketView';
import { CampsTab } from './CampsTab';
import { CampPins, CapitalPins, IronDomeOverlay } from './MapOverlays';
import { BattleLayer } from './BattleLayer';
import { BattleToasts } from './BattleToasts';
import type { PlayerState, RoomState } from '@/types';

type Tab = 'map' | 'build' | 'camps' | 'market' | 'strike' | 'news' | 'standings';

export function GameView({ room, me, isAdmin }: { room: RoomState; me: PlayerState; isAdmin: boolean }) {
  const clock = useGameClock(room);
  const news = useNews(room.id);
  const [tab, setTab] = useState<Tab>('map');
  const [speech, setSpeech] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const [detailCode, setDetailCode] = useState<string | null>(null);
  const [ffBusy, setFfBusy] = useState(false);

  useDailyTick(room.id, me, clock?.day ?? null);

  useEffect(() => {
    if (shouldShowTutorial()) setTutorial(true);
  }, []);

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

  const tabs: { id: Tab; icon: React.ReactNode; label: string; disabled?: boolean }[] = [
    { id: 'map', icon: <MapIcon className="w-4 h-4" />, label: 'World' },
    { id: 'build', icon: <Hammer className="w-4 h-4" />, label: 'Build' },
    { id: 'camps', icon: <Shield className="w-4 h-4" />, label: 'Camps' },
    { id: 'market', icon: <ShoppingCart className="w-4 h-4" />, label: 'Market' },
    { id: 'strike', icon: <Swords className="w-4 h-4" />, label: 'War', disabled: clock.phase !== 'war' },
    { id: 'news', icon: <Newspaper className="w-4 h-4" />, label: 'News' },
    { id: 'standings', icon: <Trophy className="w-4 h-4" />, label: 'Standings' },
  ];

  async function fastFwd() {
    setFfBusy(true);
    try { await fastForwardOneDay(room.id); } finally { setFfBusy(false); }
  }

  const overlays = (
    <>
      <IronDomeOverlay room={room} />
      <BattleLayer news={news} />
      <CampPins room={room} viewerUid={me.uid} />
      <CapitalPins room={room} viewerUid={me.uid} />
    </>
  );

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
          {isAdmin && (
            <button
              className="p-2 rounded-lg text-warn hover:bg-panel2"
              onClick={fastFwd}
              title="Admin: skip 24 hours (testing)"
              disabled={ffBusy}
            >
              {ffBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
            </button>
          )}
          <button
            className="p-2 rounded-lg text-muted hover:bg-panel2 hover:text-ink"
            onClick={() => setTutorial(true)}
            aria-label="How to play"
            title="How to play"
          >
            <HelpCircle className="w-4 h-4" />
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
              className={`flex-1 min-w-[64px] flex flex-col items-center gap-0.5 py-2 text-xs disabled:opacity-30 ${
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
            <WorldMap
              room={room}
              viewerCountryCode={me.countryCode}
              highlightMode="relationship"
              overlays={overlays}
              onCountryClick={(code) => setDetailCode(code)}
            />
          </div>
        )}
        {tab === 'build' && (
          <div className="p-3 space-y-3">
            <PrepPanel room={room} me={me} day={clock.day} onOpenMarket={() => setTab('market')} />
            <div className="panel p-3 text-xs text-muted">
              Tip: announcing builds in the news lets others "inspire" themselves for +1 morale,
              earning you +2 reputation. Stay silent to hide your build-up.
            </div>
          </div>
        )}
        {tab === 'camps' && (
          <div className="p-3 space-y-3">
            <CampsTab room={room} me={me} />
            <div className="panel p-3 text-xs text-muted">
              Camps let you launch ground attacks into countries that border the host nation —
              e.g. a camp in UAE projects ground reach into Saudi Arabia.
            </div>
          </div>
        )}
        {tab === 'market' && (
          <div className="p-3">
            <MarketView room={room} me={me} />
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

      <BattleToasts news={news} myUid={me.uid} />

      <SpeechModal open={speech} onClose={() => setSpeech(false)} room={room} me={me} day={clock.day} />
      <BhairavaTutorial open={tutorial} onClose={() => setTutorial(false)} room={room} me={me} />
      <CountryDetail
        open={detailCode !== null}
        onClose={() => setDetailCode(null)}
        countryCode={detailCode}
        room={room}
        me={me}
        day={clock.day}
        onAttack={(code) => { setDetailCode(null); setTab('strike'); }}
      />
    </div>
  );
}
