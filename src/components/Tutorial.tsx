import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Globe2, Hammer, Megaphone, Swords, Trophy, MapPin } from 'lucide-react';
import { COUNTRY_BY_CODE } from '@/data/countries';
import { PERKS } from '@/data/perks';
import type { PlayerState, RoomState } from '@/types';

const TUTORIAL_KEY = 'ww:tutorialSeen';

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

interface Step {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}

export function Tutorial({ open, onClose, room, me }: Props) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(true);

  if (!open) return null;

  const country = me.countryCode ? COUNTRY_BY_CODE[me.countryCode] : null;
  const otherCount = Math.max(0, Object.keys(room.players).length - 1);

  const steps: Step[] = [
    {
      icon: <Globe2 className="w-7 h-7" />,
      title: `Welcome, leader of ${country?.name ?? 'your nation'}`,
      body: (
        <>
          <p>You and {otherCount} other player{otherCount === 1 ? '' : 's'} are taking real-world nations to the brink of war.</p>
          <p className="mt-2">Your goal: control the most <span className="text-warn font-semibold">population points</span> when the war ends — through diplomacy, force, or alliances.</p>
        </>
      ),
    },
    {
      icon: <MapPin className="w-7 h-7" />,
      title: 'Reading the map',
      body: (
        <>
          <p>Countries are coloured <strong>from your perspective</strong>, based on real-world geopolitics:</p>
          <ul className="space-y-1.5 mt-3">
            <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#3b82f6' }} />You ({country?.name ?? '—'})</li>
            <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} />Friendly — natural allies, same bloc</li>
            <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} />Enemy — rivals, opposed bloc</li>
            <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#e5e7eb' }} />Neutral — you can sway them</li>
          </ul>
          <p className="text-xs text-muted mt-3">When other players claim countries, the colours update live.</p>
        </>
      ),
    },
    {
      icon: <Hammer className="w-7 h-7" />,
      title: `Preparation — ${room.prepDays} days`,
      body: (
        <>
          <p>Before the shooting starts you have <strong>{room.prepDays} real-world days</strong> to:</p>
          <ul className="space-y-1 mt-2 list-disc list-inside">
            <li>Build infantry, tanks, fighters, bombers, ships, missiles</li>
            <li>Manage your treasury, morale, reputation, innovation</li>
            <li>Forge or join alliances</li>
            <li>Win over neutral nations via diplomacy</li>
          </ul>
          <p className="text-xs text-muted mt-2">Each game day = 24 wall-clock hours. The countdown is shown in the top-right.</p>
          {me.perks.length > 0 && (
            <div className="panel-2 p-3 mt-3">
              <div className="text-xs uppercase tracking-wider text-muted mb-1.5">Your starting perks</div>
              {me.perks.map((pid) => (
                <div key={pid} className="text-sm"><span className="mr-1">{PERKS[pid].emoji}</span>{PERKS[pid].name} — <span className="text-muted">{PERKS[pid].description}</span></div>
              ))}
            </div>
          )}
        </>
      ),
    },
    {
      icon: <Megaphone className="w-7 h-7" />,
      title: 'Speeches & the news feed',
      body: (
        <>
          <p>One free address per day from the <strong>Speech</strong> button:</p>
          <ul className="space-y-1 mt-2 list-disc list-inside">
            <li>🔥 <strong>Hateful</strong> — +5 reputation</li>
            <li>💪 <strong>Motivation</strong> — +5 morale</li>
            <li>🤝 <strong>Solidarity</strong> — +2 morale, +2 reputation</li>
          </ul>
          <p className="mt-2">Publish to the news feed to attract <span className="text-warn">inspires</span> (+1 morale to readers, +2 reputation to you).</p>
          <p className="text-xs text-muted mt-2">Staying silent hides your moves but forfeits the inspire bonus — a real trade-off.</p>
        </>
      ),
    },
    {
      icon: <Swords className="w-7 h-7" />,
      title: `War — 7 days`,
      body: (
        <>
          <p>From day {room.prepDays + 1} the strike orders unlock:</p>
          <ul className="space-y-1 mt-2 list-disc list-inside">
            <li><strong>Ground</strong> — only against countries sharing a land border</li>
            <li><strong>Fighters / Bombers</strong> — global air reach</li>
            <li><strong>Naval / Missiles</strong> — global reach, more capital damage</li>
          </ul>
          <p className="mt-2">Each enemy capital starts at <span className="font-mono">10,000 HP</span>. Plan your attacks — every unit consumed.</p>
        </>
      ),
    },
    {
      icon: <Trophy className="w-7 h-7" />,
      title: 'How you win',
      body: (
        <>
          <p>When the war ends, the player (or alliance) controlling the highest <strong>population points</strong> wins.</p>
          <ul className="space-y-1 mt-2 list-disc list-inside">
            <li>Population scales with real numbers — India ≈ 1428M, USA ≈ 335M, Tuvalu ≈ 0.01M</li>
            <li>If your capital reaches 0 HP, you're eliminated</li>
            <li>Alliances pool their population — choose your partners wisely</li>
          </ul>
          <p className="text-warn mt-3 font-semibold">Good luck, leader of {country?.name ?? 'your nation'}.</p>
        </>
      ),
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  function dismiss() {
    if (dontShow) markTutorialSeen();
    setStep(0);
    onClose();
  }

  function next() {
    if (last) dismiss();
    else setStep(step + 1);
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-3">
      <div className="panel w-full max-w-md p-5 max-h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-accent">{s.icon}</div>
          <button className="p-1 rounded-lg hover:bg-panel2" onClick={dismiss} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>

        <h2 className="text-xl font-bold mb-3">{s.title}</h2>
        <div className="text-sm space-y-2 mb-4">{s.body}</div>

        <div className="flex items-center gap-1 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-panel2'}`}
            />
          ))}
        </div>

        {last && (
          <label className="flex items-center gap-2 text-xs text-muted mb-3">
            <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} className="accent-accent" />
            Don't show this again
          </label>
        )}

        <div className="flex gap-2">
          {step > 0 ? (
            <button className="btn-secondary flex-1" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4" />Back
            </button>
          ) : (
            <button className="btn-secondary flex-1" onClick={dismiss}>Skip</button>
          )}
          <button className="btn-primary flex-1" onClick={next}>
            {last ? 'Start playing' : 'Next'}
            {!last && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        <div className="text-center text-xs text-muted mt-3">
          Step {step + 1} of {steps.length}
        </div>
      </div>
    </div>
  );
}
