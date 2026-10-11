import { describe, expect, it } from 'vitest';
import { formatRankChip } from '@/lib/format/rank';

describe('formatRankChip', () => {
  it('abrevia o tier mantendo a divisão', () => {
    expect(formatRankChip('Ascendant 3')).toBe('ASC 3');
    expect(formatRankChip('Immortal 1')).toBe('IMM 1');
    expect(formatRankChip('Platinum 2')).toBe('PLT 2');
  });

  it('tier sem divisão vira só a sigla', () => {
    expect(formatRankChip('Radiant')).toBe('RAD');
  });

  it('tier vazio ou desconhecido é preservado (com trim)', () => {
    expect(formatRankChip('')).toBe('');
    expect(formatRankChip('   ')).toBe('');
    expect(formatRankChip('Desconhecido 9')).toBe('DESCONHECIDO 9');
  });
});
