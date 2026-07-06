import { useState } from 'react';
import { ChevronDown, ChevronUp, Gift, Target } from 'lucide-react';
import { patchPlayer } from '@/firebase/rooms';
import { sfx } from '@/lib/sound';
import type { PlayerState, RoomState } from '@/types';

const REWARD_MONEY = 150;
const REWARD_MORALE = 3;

// Floating daily-objectives card over the world map. Three small tasks per
// day give players a concrete reason to open the app between day ticks.
export function MissionsCard({ room, me }: { room: RoomState; me: PlayerState }) {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);

  const daily = me.daily;
  const missions = [
    { id: 'speech', emoji: '🎙️', label: 'Address the nation', done: daily.speechUsed },
    { id: 'build', emoji: '🏗️', label: 'Start 2 productions', done: (daily.buildsToday ?? 0) >= 2, progress: `${Math.min(2, daily.buildsToday ?? 0)}/2` },
    { id: 'diplomacy', emoji: '🕊️', label: 'Court a neutral nation', done: (daily.advancesToday ?? 0) >= 1 },
  ];
  const doneCount = missions.filter((m) => m.done).length;
  const allDone = doneCount === missions.length;
  const claimed = !!daily.missionClaimed;

  async function claim() {
    if (!allDone || claimed || busy) return;
    setBusy(true);
    try {
      await patchPlayer(room.id, me.uid, {
        money: me.money + REWARD_MONEY,
        morale: Math.min(100, me.morale + REWARD_MORALE),
        daily: { ...daily, missionClaimed: true },
      });
      sfx.victory();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute bottom-3 left-3 z-[600] w-[230px] panel shadow-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 bg-panel2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <Target className="w-4 h-4 text-warn shrink-0" />
        <span className="text-xs font-semibold flex-1">Daily objectives</span>
        <span className="text-[10px] font-mono text-muted">{doneCount}/{missions.length}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted" /> : <ChevronUp className="w-3.5 h-3.5 text-muted" />}
      </button>
      {open && (
        <div className="p-2.5 space-y-1.5">
          {missions.map((m) => (
            <div key={m.id} className={`flex items-center gap-2 text-xs ${m.done ? 'text-good' : 'text-muted'}`}>
              <span className="w-4 text-center">{m.done ? '✅' : m.emoji}</span>
              <span className={`flex-1 ${m.done ? 'line-through opacity-70' : ''}`}>{m.label}</span>
              {m.progress && !m.done && <span className="font-mono text-[10px]">{m.progress}</span>}
            </div>
          ))}
          <button
            className={`w-full mt-1 text-xs ${claimed ? 'btn-secondary opacity-60' : allDone ? 'btn-primary' : 'btn-secondary opacity-60'}`}
            disabled={!allDone || claimed || busy}
            onClick={claim}
          >
            <Gift className="w-3.5 h-3.5" />
            {claimed ? 'Claimed today ✓' : `Claim +$${REWARD_MONEY}M · +${REWARD_MORALE} morale`}
          </button>
        </div>
      )}
    </div>
  );
}
