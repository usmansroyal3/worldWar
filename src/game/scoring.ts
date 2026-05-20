import { COUNTRY_BY_CODE } from '@/data/countries';
import type { AllianceState, PlayerState, RoomState } from '@/types';

// Total population points held by a player (their own country + occupied territories).
export function playerScore(player: PlayerState): number {
  let total = 0;
  const codes = new Set<string>();
  if (player.countryCode) codes.add(player.countryCode);
  player.territories.forEach((t) => codes.add(t));
  codes.forEach((code) => {
    const c = COUNTRY_BY_CODE[code];
    if (c) total += c.pop;
  });
  return Math.round(total * 10) / 10;
}

export interface Standing {
  kind: 'player' | 'alliance';
  id: string;
  name: string;
  popScore: number;
  members: string[]; // player UIDs in the alliance, or [uid] for solo
  capitalsAlive: number;
}

export function computeStandings(room: RoomState): Standing[] {
  const out: Standing[] = [];
  const allianceBuckets = new Map<string, { alliance: AllianceState; members: PlayerState[] }>();

  Object.values(room.players).forEach((p) => {
    if (p.allianceId && room.alliances[p.allianceId]) {
      const al = room.alliances[p.allianceId];
      const bucket = allianceBuckets.get(al.id) ?? { alliance: al, members: [] };
      bucket.members.push(p);
      allianceBuckets.set(al.id, bucket);
    }
  });

  // Solo players: anyone not in an alliance.
  Object.values(room.players).forEach((p) => {
    if (!p.allianceId) {
      out.push({
        kind: 'player',
        id: p.uid,
        name: p.name,
        popScore: playerScore(p),
        members: [p.uid],
        capitalsAlive: p.capital.hp > 0 ? 1 : 0,
      });
    }
  });

  // Alliances aggregate the population of all members.
  allianceBuckets.forEach(({ alliance, members }) => {
    out.push({
      kind: 'alliance',
      id: alliance.id,
      name: alliance.name,
      popScore: members.reduce((acc, p) => acc + playerScore(p), 0),
      members: members.map((m) => m.uid),
      capitalsAlive: members.filter((m) => m.capital.hp > 0).length,
    });
  });

  return out.sort((a, b) => b.popScore - a.popScore);
}

export function isPlayerEliminated(p: PlayerState): boolean {
  return p.capital.hp <= 0;
}
