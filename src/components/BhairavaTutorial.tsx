import { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, Shield } from 'lucide-react';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { PERKS } from '@/data/perks';
import type { PlayerState, RoomState } from '@/types';

const TUTORIAL_KEY = 'ww:tutorialSeen-v2';

export function shouldShowTutorial(): boolean {
  try { return localStorage.getItem(TUTORIAL_KEY) !== '1'; } catch { return true; }
}

export function markTutorialSeen(): void {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
}

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  me: PlayerState;
}

interface Line {
  // 'b' = Bhairava advisor; 'p' = player options
  speaker: 'b' | 'p';
  text: string;
}

// Bhairava (your defense advisor) walks the player through the game in a
// conversational, chat-style manner. Each step contains a series of advisor
// lines that stream in one-by-one, followed by an actionable "Got it" button.

interface Step {
  title: string;
  lines: Line[];
  next?: string;
}

export function BhairavaTutorial({ open, onClose, room, me }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [linesShown, setLinesShown] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const country = me.countryCode ? COUNTRY_BY_CODE[me.countryCode] : null;
  const otherCount = Math.max(0, Object.keys(room.players).length - 1);
  const nukes = country?.nukes ?? 0;

  const steps: Step[] = [
    {
      title: 'Introductions',
      lines: [
        { speaker: 'b', text: `Namaste, ${me.name}.` },
        { speaker: 'b', text: `I am Bhairava — your Defense Advisor. The world stands on the brink of war, and ${country?.name ?? 'your nation'} needs steady hands.` },
        { speaker: 'b', text: `You have ${otherCount} other leader${otherCount === 1 ? '' : 's'} watching the board with you. Some are allies in waiting. Some are not.` },
        { speaker: 'b', text: `Let me show you what you're looking at.` },
      ],
      next: 'Show me the map',
    },
    {
      title: 'The world map',
      lines: [
        { speaker: 'b', text: `Look at the map. The colours show what each country thinks of us — not what we think of them.` },
        { speaker: 'b', text: `🟢 Green countries are friendly to us. They will sell us arms cheaper, and we can station camps on their soil.` },
        { speaker: 'b', text: `🔴 Red ones are hostile. Expect their leaders to test our defenses.` },
        { speaker: 'b', text: `⚪ White means neutral — undecided. Diplomacy can sway them.` },
        { speaker: 'b', text: `🔵 Blue is us — ${country?.name ?? 'home'}. Tap any country to inspect it: relationship rating, population, options.` },
      ],
      next: 'And our resources?',
    },
    {
      title: 'Your war room — stats',
      lines: [
        { speaker: 'b', text: `At the top of every screen you'll see six gauges. Watch them like the news.` },
        { speaker: 'b', text: `❤️ Morale — your people's belief in you. Speeches lift it. Defeats break it.` },
        { speaker: 'b', text: `📣 Reputation — how the world sees us. Above 80 and morale will rise by +5 each day on its own.` },
        { speaker: 'b', text: `💰 Treasury — your money. Spent on units, defenses, diplomacy.` },
        { speaker: 'b', text: `💡 Innovation — unlocks better weapons faster.` },
        { speaker: 'b', text: `⚔️ Army — your total fighting force.` },
        { speaker: 'b', text: `🏛️ Capital HP — if this hits zero, you're out.` },
      ],
      next: 'Tell me my perks',
    },
    {
      title: 'Your starting hand',
      lines: [
        { speaker: 'b', text: `Every leader is dealt two perks at the start. Yours:` },
        ...me.perks.map((pid) => ({
          speaker: 'b' as const,
          text: `${PERKS[pid].emoji} ${PERKS[pid].name} — ${PERKS[pid].description}`,
        })),
        ...(nukes > 0
          ? [{
              speaker: 'b' as const,
              text: `And — this stays between us — ${country?.name} holds ${nukes} nuclear warhead${nukes === 1 ? '' : 's'} in our arsenal. Each one ends a capital in a single strike. We do not use them lightly.`,
            }]
          : [{
              speaker: 'b' as const,
              text: `${country?.name ?? 'Our nation'} is non-nuclear. We win or lose on conventional force and diplomacy.`,
            }]
        ),
      ],
      next: 'What do I do first?',
    },
    {
      title: `Preparation phase — ${room.prepDays} days`,
      lines: [
        { speaker: 'b', text: `For the next ${room.prepDays} days — that's ${room.prepDays} real-world days — we prepare.` },
        { speaker: 'b', text: `Open the BUILD tab. Spend treasury on infantry, tanks, fighters, Rafales, stealth squadrons, ships, submarines, and missiles.` },
        { speaker: 'b', text: `Don't forget defenses: air defense, fortifications, and the IRON DOME. The dome is our costliest weapon, but it intercepts incoming missiles — even nuclear ones — at the cost of one missile per intercept.` },
        { speaker: 'b', text: `Visit MARKET to see what friendly nations are selling — often cheaper than building it ourselves.` },
      ],
      next: 'And on friendly soil?',
    },
    {
      title: 'Army camps abroad',
      lines: [
        { speaker: 'b', text: `Tap any green (friendly) country. You can deploy an army camp on their soil — up to 5 per country.` },
        { speaker: 'b', text: `A camp is a launching pad. Garrison it with infantry, tanks, even an airstrip. Then attack neighbouring countries from there.` },
        { speaker: 'b', text: `Example: a camp in UAE lets us launch a ground invasion of Saudi Arabia, even from India.` },
        { speaker: 'b', text: `Each camp has 2,000 HP. The enemy can target it directly. Defend it.` },
      ],
      next: 'And once war begins?',
    },
    {
      title: 'War phase — 7 days',
      lines: [
        { speaker: 'b', text: `On Day ${room.prepDays + 1}, the gloves come off.` },
        { speaker: 'b', text: `Ground attacks require a shared land border — yours, an owned territory, or a camp.` },
        { speaker: 'b', text: `Air, naval, and missile strikes hit anywhere on the globe.` },
        { speaker: 'b', text: `Each enemy capital starts at 100 HP. A bomber dents 2, a missile 5, a nuclear warhead 60. Plan every strike. Every unit is consumed.` },
        { speaker: 'b', text: `Nuclear weapons need morale AND reputation above 95. Solo leaders lose 45% reputation after a strike — alliance members lose 30%, but every ally must approve the launch first.` },
      ],
      next: 'And the news?',
    },
    {
      title: 'The news feed — your information war',
      lines: [
        { speaker: 'b', text: `Once a day you may give a free speech: Hateful (+5 reputation), Motivation (+5 morale), or Solidarity (+2/+2).` },
        { speaker: 'b', text: `Publish it to the NEWS feed and other leaders may "inspire" themselves from it — they gain +1 morale, we gain +2 reputation per inspire.` },
        { speaker: 'b', text: `But — stay silent and the world doesn't see our plans. Builds and attacks can be hidden too. Pick your moments.` },
      ],
      next: 'How do I win?',
    },
    {
      title: 'Victory',
      lines: [
        { speaker: 'b', text: `When the seven war days are done, whoever controls the most population — solo or by alliance — takes the world.` },
        { speaker: 'b', text: `Size of territory doesn't matter. Population does. China, India, the US — these are the heavy stones. Tuvalu is barely a pebble.` },
        { speaker: 'b', text: `Or — destroy every other capital and end it early.` },
        { speaker: 'b', text: `That is all I can teach in one sitting. Tap ❓ at the top of the screen any time to summon me again.` },
        { speaker: 'b', text: `Now — let us begin. Jai Hind${country?.code === 'IN' ? '!' : ' — or whatever your people cry.'}` },
      ],
      next: 'Start playing',
    },
  ];

  const step = steps[stepIdx];
  const isLastStep = stepIdx === steps.length - 1;
  const isLastLine = linesShown >= step.lines.length;

  useEffect(() => {
    setLinesShown(1);
  }, [stepIdx]);

  useEffect(() => {
    if (!open) return;
    if (linesShown >= step.lines.length) return;
    const t = setTimeout(() => setLinesShown((n) => n + 1), 650);
    return () => clearTimeout(t);
  }, [linesShown, step.lines.length, open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [linesShown]);

  if (!open) return null;

  function advance() {
    if (!isLastLine) {
      setLinesShown(step.lines.length);
      return;
    }
    if (isLastStep) {
      markTutorialSeen();
      setStepIdx(0);
      onClose();
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function skip() {
    markTutorialSeen();
    setStepIdx(0);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 flex flex-col p-3">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent flex items-center justify-center">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="font-semibold text-sm">Bhairava</div>
            <div className="text-xs text-muted">Defense Advisor · {step.title}</div>
          </div>
        </div>
        <button className="text-xs text-muted hover:text-ink" onClick={skip}>Skip</button>
      </header>

      <div className="flex items-center gap-1 mb-3 px-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < stepIdx ? 'bg-accent' : i === stepIdx ? 'bg-accent/60' : 'bg-panel2'}`} />
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pb-3">
        {step.lines.slice(0, linesShown).map((ln, i) => (
          <div key={i} className="flex items-start gap-2 animate-fade-in">
            {ln.speaker === 'b' ? (
              <>
                <div className="w-7 h-7 shrink-0 rounded-full bg-accent/20 border border-accent flex items-center justify-center text-xs">
                  <Shield className="w-3.5 h-3.5 text-accent" />
                </div>
                <div className="panel-2 p-3 text-sm max-w-[85%]">{ln.text}</div>
              </>
            ) : (
              <div className="ml-auto panel p-3 text-sm max-w-[85%] bg-accent/20">{ln.text}</div>
            )}
          </div>
        ))}
        {!isLastLine && (
          <div className="flex items-center gap-2 text-muted text-xs ml-9">
            <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" />
            <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <button className="btn-primary w-full" onClick={advance}>
          {isLastLine ? (step.next ?? 'Continue') : 'Tap to continue'}
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="text-center text-xs text-muted mt-2">
          Step {stepIdx + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
