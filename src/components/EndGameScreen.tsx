import { useEffect, useMemo } from 'react';
import { Trophy, Skull, Crown, Award, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { computeStandings } from '@/game/scoring';
import { sfx } from '@/lib/sound';
import type { PlayerState, RoomState } from '@/types';

interface Props { room: RoomState; me: PlayerState }

interface Award {
  emoji: string;
  title: string;
  winnerName: string;
  detail: string;
}

export function EndGameScreen({ room, me }: Props) {
  const navigate = useNavigate();
  const standings = computeStandings(room);
  const winner = standings[0];
  const isMyWin = winner ? (winner.kind === 'player' ? winner.id === me.uid : winner.members.includes(me.uid)) : false;

  useEffect(() => {
    if (isMyWin) sfx.victory(); else sfx.defeat();
  }, [isMyWin]);

  const awards: Award[] = useMemo(() => {
    const out: Award[] = [];
    const players = Object.values(room.players);
    function topBy(field: (p: PlayerState) => number, title: string, emoji: string, fmt: (n: number) => string) {
      const sorted = [...players].sort((a, b) => field(b) - field(a));
      const top = sorted[0];
      if (!top || field(top) <= 0) return;
      out.push({ emoji, title, winnerName: top.name, detail: fmt(field(top)) });
    }
    topBy(p => p.totals?.damageDealt ?? 0, 'Most Destructive', '💥', n => `${Math.round(n)} damage dealt`);
    topBy(p => p.totals?.damageTaken ?? 0, 'Most Resilient (took the most punishment)', '🛡️', n => `${Math.round(n)} damage absorbed`);
    topBy(p => p.totals?.nukesLaunched ?? 0, 'Atomic Hawk', '☢️', n => `${n} nuke${n === 1 ? '' : 's'} launched`);
    topBy(p => p.totals?.spentOnBuilds ?? 0, 'Industrial Titan', '🏭', n => `$${n.toLocaleString()}M spent`);
    topBy(p => p.totals?.intelOps ?? 0, 'Spymaster', '🛰️', n => `${n} intel op${n === 1 ? '' : 's'}`);
    topBy(p => p.totals?.speechesGiven ?? 0, 'Voice of the People', '📣', n => `${n} speech${n === 1 ? '' : 'es'}`);
    return out;
  }, [room.players]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-3 ${isMyWin ? 'bg-warn/30 border-warn border-2' : 'bg-bad/20 border-bad border-2'}`}>
            {isMyWin ? <Trophy className="w-8 h-8 text-warn" /> : <Skull className="w-8 h-8 text-bad" />}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted mb-1">Game Over</div>
          <h1 className="text-2xl font-bold mb-1">
            {isMyWin ? 'You won the world.' : `${winner?.name ?? 'No one'} took the world.`}
          </h1>
          <div className="text-sm text-muted">
            {winner?.kind === 'alliance' ? `Alliance: ${winner.name}` : `Solo victory`}
            {winner && ` · ${Math.round(winner.popScore)}M population points`}
          </div>
        </div>

        <section className="panel p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-warn" />
            <h2 className="font-semibold">Final standings</h2>
          </div>
          <ul className="space-y-2">
            {standings.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 panel-2 p-2">
                <span className={`w-6 text-center font-mono text-sm ${i === 0 ? 'text-warn' : 'text-muted'}`}>#{i + 1}</span>
                <span className="flex-1 truncate">{s.name}</span>
                <span className="font-mono text-warn">{s.popScore.toFixed(0)}M</span>
              </li>
            ))}
          </ul>
        </section>

        {awards.length > 0 && (
          <section className="panel p-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-accent" />
              <h2 className="font-semibold">MVP awards</h2>
            </div>
            <ul className="space-y-2 text-sm">
              {awards.map((a, i) => (
                <li key={i} className="panel-2 p-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span><span className="mr-1">{a.emoji}</span><span className="font-semibold">{a.title}</span></span>
                    <span className="text-xs text-muted">{a.winnerName}</span>
                  </div>
                  <div className="text-xs text-muted">{a.detail}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button className="btn-primary w-full" onClick={() => navigate('/')}>
          <Home className="w-4 h-4" />
          Back to home
        </button>
      </div>
    </div>
  );
}
