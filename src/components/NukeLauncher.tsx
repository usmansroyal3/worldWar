import { useMemo, useState } from 'react';
import { X, Loader2, Skull } from 'lucide-react';
import { COUNTRIES_BY_NAME, COUNTRY_BY_CODE } from '@/data/countries';
import { allianceMembers, canLaunchNuke, isProposalApproved, makeProposal, applyReputationDrop, NUKE_CAPITAL_DMG } from '@/game/nuclear';
import { approveNuke, cancelNuke, patchPlayer, postNews, proposeNuke } from '@/firebase/rooms';
import type { PendingNuke, PlayerState, RoomState } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  room: RoomState;
  me: PlayerState;
  day: number;
}

export function NukeLauncher({ open, onClose, room, me, day }: Props) {
  const [target, setTarget] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const gate = useMemo(() => canLaunchNuke(me), [me]);
  const inAlliance = !!me.allianceId && !!room.alliances[me.allianceId];
  const members = allianceMembers(room, me.uid);

  // Existing proposal authored by me (if any)
  const myProposal = useMemo(() => {
    return Object.values(room.pendingNukes ?? {}).find((p) => p.proposerId === me.uid) ?? null;
  }, [room.pendingNukes, me.uid]);

  // Proposals where I should vote
  const votableProposals = useMemo(() => {
    return Object.values(room.pendingNukes ?? {}).filter((p) => {
      if (p.proposerId === me.uid) return false;
      const proposerAlliance = room.players[p.proposerId]?.allianceId;
      return !!proposerAlliance && proposerAlliance === me.allianceId && !p.approvedBy.includes(me.uid);
    });
  }, [room.pendingNukes, room.players, me.allianceId, me.uid]);

  if (!open) return null;

  async function proposeOrLaunch() {
    if (!target || !gate.ok) return;
    setBusy(true);
    try {
      if (!inAlliance) {
        await execute(target);
      } else {
        // Solo path skipped above; here we propose to alliance.
        const targetPlayer = Object.values(room.players).find((p) => p.countryCode === target);
        const proposal = makeProposal(me, target, targetPlayer?.uid ?? null, day);
        await proposeNuke(room.id, proposal);
      }
    } finally {
      setBusy(false);
    }
  }

  async function execute(targetCode: string) {
    if (me.army.nukes <= 0) return;
    const newRep = applyReputationDrop(me, room);
    const targetPlayer = Object.values(room.players).find((p) => p.countryCode === targetCode);
    const tasks: Promise<unknown>[] = [];

    tasks.push(
      patchPlayer(room.id, me.uid, {
        army: { ...me.army, nukes: me.army.nukes - 1 },
        reputation: newRep,
      })
    );
    if (targetPlayer) {
      const newHp = Math.max(0, targetPlayer.capital.hp - NUKE_CAPITAL_DMG);
      tasks.push(
        patchPlayer(room.id, targetPlayer.uid, {
          capital: { ...targetPlayer.capital, hp: newHp },
          morale: Math.max(0, targetPlayer.morale - 30),
        })
      );
    }
    tasks.push(
      postNews(room.id, {
        authorId: me.uid,
        authorName: me.name,
        authorCountry: me.countryCode,
        day,
        kind: 'nuke',
        title: `☢️ NUCLEAR STRIKE: ${COUNTRY_BY_CODE[me.countryCode!]?.name} → ${COUNTRY_BY_CODE[targetCode]?.name}`,
        body: `A nuclear warhead detonates over ${COUNTRY_BY_CODE[targetCode]?.name}. Capital damage: ${NUKE_CAPITAL_DMG}. ${me.name}'s reputation falls to ${newRep}.`,
        meta: { routeFrom: me.countryCode, routeTo: targetCode, dmg: NUKE_CAPITAL_DMG },
      })
    );
    await Promise.all(tasks);
  }

  async function approveProposal(p: PendingNuke) {
    setBusy(true);
    try {
      await approveNuke(room.id, p.id, me.uid);
    } finally {
      setBusy(false);
    }
  }

  async function executeMyProposal() {
    if (!myProposal) return;
    setBusy(true);
    try {
      await execute(myProposal.targetCode);
      await cancelNuke(room.id, myProposal.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function cancelMyProposal() {
    if (!myProposal) return;
    await cancelNuke(room.id, myProposal.id);
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 flex items-end sm:items-center justify-center p-3">
      <div className="panel w-full max-w-md p-4 max-h-full overflow-y-auto border-bad/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-semibold text-bad">
            <Skull className="w-5 h-5" />
            Nuclear strike protocol
          </div>
          <button className="p-1 rounded-lg hover:bg-panel2" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="panel-2 p-3 mb-3 text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted">Warheads</span><span className="font-mono">{me.army.nukes}</span></div>
          <div className="flex justify-between"><span className="text-muted">Morale (need ≥ 95)</span><span className={me.morale >= 95 ? 'text-good' : 'text-bad'}>{Math.round(me.morale)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Reputation (need ≥ 95)</span><span className={me.reputation >= 95 ? 'text-good' : 'text-bad'}>{Math.round(me.reputation)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Strike damage</span><span className="font-mono text-warn">{NUKE_CAPITAL_DMG} cap. HP</span></div>
          <div className="flex justify-between"><span className="text-muted">Reputation penalty</span><span className="text-bad">{inAlliance ? '30%' : '45%'}</span></div>
        </div>

        {!gate.ok && (
          <div className="panel-2 p-3 mb-3 text-xs border-bad/50 border text-bad">{gate.reason}</div>
        )}

        {/* Existing proposal from me */}
        {myProposal && (
          <div className="panel-2 p-3 mb-3 border border-warn">
            <div className="text-sm font-semibold mb-1">Your proposal: strike {COUNTRY_BY_CODE[myProposal.targetCode]?.name}</div>
            <div className="text-xs text-muted mb-2">
              Alliance approval: {myProposal.approvedBy.length} / {members.length}
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={cancelMyProposal}>Cancel</button>
              <button
                className="btn-danger flex-1"
                onClick={executeMyProposal}
                disabled={busy || !isProposalApproved(room, myProposal)}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Skull className="w-4 h-4" />}
                {isProposalApproved(room, myProposal) ? 'LAUNCH' : 'Awaiting allies'}
              </button>
            </div>
          </div>
        )}

        {/* Votable proposals from alliance members */}
        {votableProposals.length > 0 && (
          <div className="mb-3">
            <div className="text-xs uppercase tracking-wider text-muted mb-2">Alliance vote</div>
            {votableProposals.map((p) => (
              <div key={p.id} className="panel-2 p-3 mb-2">
                <div className="text-sm mb-2">
                  <strong>{room.players[p.proposerId]?.name}</strong> proposes a nuclear strike on{' '}
                  <strong>{COUNTRY_BY_CODE[p.targetCode]?.name}</strong>.
                </div>
                <button className="btn-danger w-full" onClick={() => approveProposal(p)} disabled={busy}>
                  Approve launch
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New proposal/launch */}
        {!myProposal && (
          <>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">Target</label>
            <select
              className="input w-full mb-3"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={!gate.ok}
            >
              <option value="">Choose target...</option>
              {COUNTRIES_BY_NAME.filter((c) => c.code !== me.countryCode).map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            <button className="btn-danger w-full" onClick={proposeOrLaunch} disabled={!target || !gate.ok || busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Skull className="w-4 h-4" />}
              {inAlliance ? 'Propose to alliance' : 'LAUNCH'}
            </button>
            {inAlliance && (
              <div className="text-xs text-muted mt-2 text-center">
                {members.length} alliance member{members.length === 1 ? '' : 's'} must all approve before the warhead launches.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
