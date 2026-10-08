import { describe, expect, it } from 'vitest';
import {
  buildEvolutionCoachInsight,
  EVOLUTION_THRESHOLDS,
  type EvolutionSnapshotInput,
} from '@/services/analytics/evolution';

/**
 * SUITE TDD — análise de evolução entre snapshots (services/analytics/evolution).
 *
 * Regra das metades: baseline = metade MAIS ANTIGA da janela, current =
 * metade MAIS RECENTE (médias por métrica sobre valores não-nulos). Com 2
 * snapshots degenera em comparação direta. Tendência por threshold ABSOLUTO
 * por métrica (determinístico e auditável). Números verificados à mão.
 */

const snap = (overrides: Partial<EvolutionSnapshotInput> = {}): EvolutionSnapshotInput => ({
  kdr: 1,
  kpr: 0.7,
  acs: 180,
  hsPercentage: 20,
  kast: 70,
  firstBloods: 5,
  firstDeaths: 5,
  createdAt: new Date('2026-10-01T12:00:00Z'),
  ...overrides,
});

describe('calculateEvolution (via buildEvolutionCoachInsight)', () => {
  it('detecta melhora consistente em todas as métricas (n=2, comparação direta)', () => {
    const insight = buildEvolutionCoachInsight(
      [
        snap(),
        snap({
          kdr: 1.3,
          kpr: 0.9,
          acs: 220,
          hsPercentage: 24,
          kast: 75,
          firstBloods: 8,
          firstDeaths: 4,
          createdAt: new Date('2026-10-08T12:00:00Z'),
        }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    expect(insight.evolution.kdr).toEqual({ baseline: 1, current: 1.3, delta: 0.3, trend: 'Melhorando' });
    expect(insight.evolution.acs).toEqual({ baseline: 180, current: 220, delta: 40, trend: 'Melhorando' });
    expect(insight.evolution.hsPercentage).toEqual({ baseline: 20, current: 24, delta: 4, trend: 'Melhorando' });
    expect(insight.evolution.kast).toEqual({ baseline: 70, current: 75, delta: 5, trend: 'Melhorando' });
    expect(insight.evolution.fbRatio).toEqual({ baseline: 1, current: 2, delta: 1, trend: 'Melhorando' });

    expect(insight.raw_metrics).toMatchObject({ kdr: 1.3, acs: 220, hsPercentage: 24, fbRatio: 2, snapshots: 2 });
    expect(insight.window).toEqual({
      from: '2026-10-01T12:00:00.000Z',
      to: '2026-10-08T12:00:00.000Z',
    });

    const joined = insight.coaching_hooks.join(' ');
    expect(joined).toMatch(/Evolução em KDR: 1\.00 → 1\.30 \(\+0\.30\)/);
    expect(joined).toMatch(/Evolução em HS%: 20\.0 → 24\.0 \(\+4\.0pp\)/);
    expect(joined).toMatch(/Histórico curto: 2 análises/);
  });

  it('detecta queda e gera hooks de investigação', () => {
    const insight = buildEvolutionCoachInsight(
      [
        snap({ kdr: 1.3, hsPercentage: 24, acs: 220 }),
        snap({ kdr: 1.0, hsPercentage: 20, acs: 180, createdAt: new Date('2026-10-08T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    expect(insight.evolution.kdr?.trend).toBe('Piorando');
    expect(insight.evolution.hsPercentage?.delta).toBe(-4);
    expect(insight.coaching_hooks.join(' ')).toMatch(/Queda em KDR: 1\.30 → 1\.00 \(-0\.30\)/);
    expect(insight.coaching_hooks.join(' ')).toMatch(/investigar mudanças recentes/);
  });

  it('métricas estáveis em toda a janela geram hook de variação de treino', () => {
    const insight = buildEvolutionCoachInsight(
      [snap(), snap({ createdAt: new Date('2026-10-08T12:00:00Z') })],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    expect(Object.values(insight.evolution).every((m) => m?.trend === 'Estável')).toBe(true);
    expect(insight.coaching_hooks.join(' ')).toMatch(/estáveis no período/);
  });

  it('média das metades com janela ímpar: baseline = mais antiga, current = média das recentes', () => {
    const insight = buildEvolutionCoachInsight(
      [
        snap({ kdr: 1.0, createdAt: new Date('2026-10-01T12:00:00Z') }),
        snap({ kdr: 1.1, createdAt: new Date('2026-10-03T12:00:00Z') }),
        snap({ kdr: 1.4, createdAt: new Date('2026-10-05T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    // baseline = [1.0]; current = média(1.1, 1.4) = 1.25
    expect(insight.evolution.kdr).toEqual({ baseline: 1, current: 1.25, delta: 0.25, trend: 'Melhorando' });
  });

  it('média ignora nulos parciais dentro da mesma metade', () => {
    const insight = buildEvolutionCoachInsight(
      [
        snap({ hsPercentage: 20, createdAt: new Date('2026-10-01T12:00:00Z') }),
        snap({ hsPercentage: null, createdAt: new Date('2026-10-02T12:00:00Z') }),
        snap({ hsPercentage: 24, createdAt: new Date('2026-10-03T12:00:00Z') }),
        snap({ hsPercentage: null, createdAt: new Date('2026-10-04T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    // baseline = média(20) = 20; current = média(24) = 24
    expect(insight.evolution.hsPercentage).toEqual({ baseline: 20, current: 24, delta: 4, trend: 'Melhorando' });
  });

  it('métrica ausente em UMA das metades é omitida do envelope (nunca inventada)', () => {
    const insight = buildEvolutionCoachInsight(
      [
        snap({ hsPercentage: 20 }),
        snap({ hsPercentage: null, createdAt: new Date('2026-10-08T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    expect(insight.evolution.hsPercentage).toBeUndefined();
    expect('hsPercentage' in insight.raw_metrics).toBe(false);
    expect('hsPercentage' in insight.contextual_rating).toBe(false);
    expect(insight.coaching_hooks.join(' ')).not.toMatch(/HS%/);
  });

  it('fbRatio usa a convenção fd=0 → ratio = fb e é omitido sem dados de entrada', () => {
    const noEntryData = buildEvolutionCoachInsight(
      [
        snap({ firstBloods: null, firstDeaths: null }),
        snap({ firstBloods: null, firstDeaths: null, createdAt: new Date('2026-10-08T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );
    expect('fbRatio' in noEntryData.raw_metrics).toBe(false);

    const immortal = buildEvolutionCoachInsight(
      [
        snap({ firstBloods: 5, firstDeaths: 5 }),
        snap({ firstBloods: 6, firstDeaths: 0, createdAt: new Date('2026-10-08T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );
    // baseline ratio 1; current fd=0 → ratio = 6
    expect(immortal.evolution.fbRatio).toEqual({ baseline: 1, current: 6, delta: 5, trend: 'Melhorando' });
    expect('fbRatio' in immortal.contextual_rating).toBe(false); // sem benchmark próprio
  });

  it('limites dos thresholds: |delta| igual ao limite classifica, abaixo fica Estável', () => {
    const atLimit = buildEvolutionCoachInsight(
      [snap({ kdr: 1 }), snap({ kdr: 1.08, createdAt: new Date('2026-10-08T12:00:00Z') })],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );
    const belowLimit = buildEvolutionCoachInsight(
      [snap({ kdr: 1 }), snap({ kdr: 1.07, createdAt: new Date('2026-10-08T12:00:00Z') })],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    expect(atLimit.evolution.kdr?.trend).toBe('Melhorando');
    expect(belowLimit.evolution.kdr?.trend).toBe('Estável');
    expect(EVOLUTION_THRESHOLDS.kdr).toBe(0.08);
  });

  it('rating semântico usa os benchmarks ABSOLUTOS sobre os valores atuais', () => {
    const insight = buildEvolutionCoachInsight(
      [
        snap({ kdr: 1, acs: 180 }),
        snap({ kdr: 1.3, acs: 220, createdAt: new Date('2026-10-08T12:00:00Z') }),
      ],
      { region: 'br', name: 'Player', tag: 'BR1' },
    );

    // kdr atual 1.3 → 'Acima da Média' (≥1.15); acs 220 → 'Acima da Média' (≥215)
    expect(insight.contextual_rating.kdr).toBe('Acima da Média');
    expect(insight.contextual_rating.acs).toBe('Acima da Média');
    expect(insight.player).toEqual({ region: 'br', name: 'Player', tag: 'BR1' });
  });
});
