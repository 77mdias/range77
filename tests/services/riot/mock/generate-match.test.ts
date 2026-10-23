import { describe, expect, it } from 'vitest';
import type { RiotLocationDto, RiotMatchDto } from '@/contracts/riot';
import { generateAccount, generateMatchlist } from '@/services/riot/mock/generate-account';
import { generateMatch } from '@/services/riot/mock/generate-match';
import { MOCK_MAPS } from '@/services/riot/mock/map-zones';

/**
 * SUITE — invariantes do gerador de partidas simuladas VAL-MATCH-V1.
 * A amostra cobre várias contas fictícias e centenas de partidas.
 */

const acc = generateAccount('ValCoachDemo', 'DEMO');
const sample: readonly RiotMatchDto[] = generateMatchlist(acc, 200).history.map((h) => generateMatch(h.matchId, acc));
const others = [generateAccount('Lince', 'ZEN'), generateAccount('Sabiá', '0101')].flatMap((a) =>
  generateMatchlist(a, 20).history.map((h) => ({ acc: a, match: generateMatch(h.matchId, a) })),
);

function inside(p: RiotLocationDto, polygon: readonly RiotLocationDto[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

describe('generateMatch', () => {
  const id = generateMatchlist(acc, 1).history[0]!.matchId;

  it('generateMatch é determinístico', { timeout: 20_000 }, () => {
    expect(JSON.stringify(generateMatch(id, acc))).toBe(JSON.stringify(generateMatch(id, acc)));
  });

  it('foco presente', { timeout: 20_000 }, () => {
    expect(generateMatch(id, acc).players.some((p) => p.puuid === acc.puuid)).toBe(true);
    for (const { acc: a, match } of others) {
      const focus = match.players.filter((p) => p.puuid === a.puuid);
      expect(focus).toHaveLength(1);
      expect(focus[0]!.gameName).toBe(a.gameName);
    }
  });

  it('forma: 10 jogadores, 5 por time, agentes únicos por time, rounds 0-based', { timeout: 20_000 }, () => {
    for (const m of sample) {
      expect(m.players).toHaveLength(10);
      expect(new Set(m.players.map((p) => p.puuid)).size).toBe(10);
      for (const team of ['Red', 'Blue']) {
        const members = m.players.filter((p) => p.teamId === team);
        expect(members).toHaveLength(5);
        expect(new Set(members.map((p) => p.characterId)).size).toBe(5);
      }
      expect(m.matchInfo.matchId).toBe(m.matchInfo.matchId.toLowerCase());
      expect(MOCK_MAPS.map((x) => x.mapId)).toContain(m.matchInfo.mapId);
      m.roundResults.forEach((r, i) => {
        expect(r.roundNum).toBe(i);
        expect(r.playerStats).toHaveLength(10);
        for (const s of r.playerStats) {
          expect(s.ability).toEqual({ grenadeEffects: null, ability1Effects: null, ability2Effects: null, ultimateEffects: null });
        }
      });
    }
  });

  it('placar fecha', { timeout: 20_000 }, () => {
    for (const m of sample) {
      const [a, b] = m.teams;
      const hi = Math.max(a!.roundsWon, b!.roundsWon);
      const lo = Math.min(a!.roundsWon, b!.roundsWon);
      const total = m.roundResults.length;
      expect(a!.roundsWon + b!.roundsWon).toBe(total);
      const regulation = hi === 13 && lo <= 11;
      const overtime = hi - lo === 2 && total >= 26;
      expect(regulation || overtime).toBe(true);
      const winner = m.teams.find((t) => t.won)!;
      expect(winner.roundsWon).toBe(hi);
      expect(m.roundResults.filter((r) => r.winningTeam === winner.teamId)).toHaveLength(hi);
      // A partida termina exatamente no round decisivo.
      expect(m.roundResults[total - 1]!.winningTeam).toBe(winner.teamId);
    }
  });

  it('overtime existe na amostra', { timeout: 20_000 }, () => {
    expect(sample.some((m) => m.roundResults.length > 24)).toBe(true);
  });

  it('lados trocam no round 13 e a cada round no overtime', { timeout: 20_000 }, () => {
    for (const m of sample) {
      for (const r of m.roundResults) {
        const attackers = r.roundNum < 12 ? 'Red' : r.roundNum < 24 ? 'Blue' : r.roundNum % 2 === 0 ? 'Red' : 'Blue';
        expect(r.winningTeamRole).toBe(r.winningTeam === attackers ? 'Attacker' : 'Defender');
        if (r.bombPlanter) {
          expect(m.players.find((p) => p.puuid === r.bombPlanter)!.teamId).toBe(attackers);
          expect(r.plantSite).toBeDefined();
          expect(r.plantRoundTime).toBeDefined();
        }
        if (r.roundResultCode === 'Detonate') {
          expect(r.winningTeam).toBe(attackers);
          expect(r.bombPlanter).toBeDefined();
        }
        if (r.roundResultCode === 'Defuse') {
          expect(r.winningTeam).not.toBe(attackers);
          expect(m.players.find((p) => p.puuid === r.bombDefuser)!.teamId).not.toBe(attackers);
          expect(r.defuseRoundTime!).toBeGreaterThan(r.plantRoundTime!);
        }
      }
    }
  });

  it('KDA bate com a timeline', { timeout: 20_000 }, () => {
    for (const m of sample) {
      const kills = m.roundResults.flatMap((r) => r.playerStats.flatMap((s) => s.kills));
      for (const p of m.players) {
        expect(p.stats).not.toBeNull();
        expect(kills.filter((k) => k.killer === p.puuid)).toHaveLength(p.stats!.kills);
        expect(kills.filter((k) => k.victim === p.puuid)).toHaveLength(p.stats!.deaths);
        expect(kills.filter((k) => k.assistants.includes(p.puuid))).toHaveLength(p.stats!.assists);
        expect(p.stats!.roundsPlayed).toBe(m.roundResults.length);
        expect(p.stats!.score).toBe(m.roundResults.reduce((s, r) => s + r.playerStats.find((x) => x.puuid === p.puuid)!.score, 0));
      }
      // Ninguém morre duas vezes no mesmo round; abates entre times opostos.
      for (const r of m.roundResults) {
        const roundKills = r.playerStats.flatMap((s) => s.kills.map((k) => ({ ...k, owner: s.puuid })));
        const victims = roundKills.map((k) => k.victim);
        expect(new Set(victims).size).toBe(victims.length);
        for (const k of roundKills) {
          expect(k.owner).toBe(k.killer);
          const killer = m.players.find((p) => p.puuid === k.killer)!;
          const victim = m.players.find((p) => p.puuid === k.victim)!;
          expect(killer.teamId).not.toBe(victim.teamId);
          expect(k.assistants).not.toContain(k.killer);
          for (const a of k.assistants) expect(m.players.find((p) => p.puuid === a)!.teamId).toBe(killer.teamId);
        }
        // Eliminação: o time perdedor inteiro morreu.
        if (r.roundResultCode === 'Elimination') {
          const loser = m.players.filter((p) => p.teamId !== r.winningTeam).map((p) => p.puuid);
          for (const l of loser) expect(victims).toContain(l);
        }
      }
    }
  });

  it('tempos de abate entre 5s e 100s, crescentes no round', { timeout: 20_000 }, () => {
    for (const m of sample) {
      let lastGame = -1;
      for (const r of m.roundResults) {
        const times = r.playerStats
          .flatMap((s) => s.kills)
          .sort((a, b) => a.timeSinceGameStartMillis - b.timeSinceGameStartMillis);
        let last = 0;
        for (const k of times) {
          expect(k.timeSinceRoundStartMillis).toBeGreaterThanOrEqual(5000);
          expect(k.timeSinceRoundStartMillis).toBeLessThanOrEqual(100000);
          expect(k.timeSinceRoundStartMillis).toBeGreaterThan(last);
          expect(k.timeSinceGameStartMillis).toBeGreaterThan(lastGame);
          last = k.timeSinceRoundStartMillis;
          lastGame = k.timeSinceGameStartMillis;
        }
      }
      expect(lastGame).toBeLessThan(m.matchInfo.gameLengthMillis);
    }
  });

  it('economia plausível', { timeout: 20_000 }, () => {
    for (const m of sample) {
      for (const r of m.roundResults) {
        for (const s of r.playerStats) {
          const e = s.economy!;
          expect(e).not.toBeNull();
          expect(e.spent).toBeLessThanOrEqual(9000);
          expect(e.remaining).toBeGreaterThanOrEqual(0);
          expect(e.spent + e.remaining).toBeLessThanOrEqual(9000);
          expect(e.weapon).not.toBe('');
          if (r.roundNum === 0 || r.roundNum === 12) expect(e.loadoutValue).toBeLessThanOrEqual(800);
        }
      }
    }
  });

  it('posições dentro do mapa', { timeout: 20_000 }, () => {
    for (const m of [...sample, ...others.map((o) => o.match)]) {
      const map = MOCK_MAPS.find((x) => x.mapId === m.matchInfo.mapId)!;
      const within = (p: RiotLocationDto) => map.zones.some((z) => inside(p, z.polygon));
      for (const r of m.roundResults) {
        for (const k of r.playerStats.flatMap((s) => s.kills)) {
          expect(within(k.victimLocation)).toBe(true);
          expect(k.playerLocations.length).toBeGreaterThanOrEqual(1);
          for (const pl of k.playerLocations) expect(within(pl.location)).toBe(true);
        }
        if (r.plantLocation) expect(within(r.plantLocation)).toBe(true);
        if (r.defuseLocation) expect(within(r.defuseLocation)).toBe(true);
      }
    }
  });

  it('posição do jogador é estável entre eventos do mesmo round sem troca de zona', { timeout: 20_000 }, () => {
    for (const m of sample) {
      for (const r of m.roundResults) {
        const kills = r.playerStats.flatMap((s) => s.kills);
        const plantAt = r.plantRoundTime ?? Infinity;
        // Única troca de zona antes do defuse: o plant (rotação para o site).
        for (const phase of [kills.filter((k) => k.timeSinceRoundStartMillis < plantAt), kills.filter((k) => k.timeSinceRoundStartMillis > plantAt)]) {
          const seen = new Map<string, string>();
          const check = (puuid: string, p: RiotLocationDto) => {
            const key = `${p.x},${p.y}`;
            expect(seen.get(puuid) ?? key).toBe(key);
            seen.set(puuid, key);
          };
          if (phase.length > 0 && phase[0]!.timeSinceRoundStartMillis > plantAt) {
            for (const pl of r.plantPlayerLocations ?? []) check(pl.puuid, pl.location);
          }
          for (const k of phase) {
            check(k.victim, k.victimLocation);
            for (const pl of k.playerLocations) check(pl.puuid, pl.location);
          }
        }
      }
    }
  });

  it('dano só entre vivos: quem sobrevive ao round nunca recebeu dano letal (< 150)', { timeout: 20_000 }, () => {
    for (const m of sample) {
      for (const r of m.roundResults) {
        const victims = new Set(r.playerStats.flatMap((s) => s.kills.map((k) => k.victim)));
        const received = new Map<string, number>();
        for (const d of r.playerStats.flatMap((s) => s.damage)) {
          received.set(d.receiver, (received.get(d.receiver) ?? 0) + d.damage);
        }
        for (const [puuid, total] of received) if (!victims.has(puuid)) expect(total).toBeLessThan(150);
      }
    }
  });

  it('defuse ≥ 7s após o plant', { timeout: 20_000 }, () => {
    const defuses = sample.flatMap((m) => m.roundResults.filter((r) => r.bombDefuser !== undefined));
    expect(defuses.length).toBeGreaterThan(0);
    for (const r of defuses) expect(r.defuseRoundTime! - r.plantRoundTime!).toBeGreaterThanOrEqual(7000);
  });

  it('usa todos os mapas e varia os resultados do foco', { timeout: 20_000 }, () => {
    expect(new Set(sample.map((m) => m.matchInfo.mapId)).size).toBe(MOCK_MAPS.length);
    const wins = sample.filter((m) => {
      const me = m.players.find((p) => p.puuid === acc.puuid)!;
      return m.teams.find((t) => t.teamId === me.teamId)!.won;
    }).length;
    expect(wins).toBeGreaterThan(60);
    expect(wins).toBeLessThan(140);
  });

  it('matchId fora do matchlist do foco ainda gera partida coerente', { timeout: 20_000 }, () => {
    const foreign = '0f0f0f0f-1111-4222-8333-444455556666';
    const m = generateMatch(foreign, acc);
    expect(m.matchInfo.matchId).toBe(foreign);
    expect(m.players.some((p) => p.puuid === acc.puuid)).toBe(true);
  });
});
