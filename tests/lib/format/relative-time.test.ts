import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from '@/lib/format/relative-time';

/**
 * SUITE TDD — tempo relativo pt-BR determinístico (now injetável).
 */

const NOW = new Date('2026-10-08T18:00:00.000Z');
const secondsAgo = (seconds: number) => NOW.getTime() - seconds * 1000;

describe('formatRelativeTime', () => {
  it('retorna vazio para null/undefined/valor inválido', () => {
    expect(formatRelativeTime(null, NOW)).toBe('');
    expect(formatRelativeTime(undefined, NOW)).toBe('');
    expect(formatRelativeTime('não-é-data', NOW)).toBe('');
  });

  it('colapsa agora e datas futuras em "agora"', () => {
    expect(formatRelativeTime(NOW, NOW)).toBe('agora');
    expect(formatRelativeTime(secondsAgo(30), NOW)).toBe('agora');
    expect(formatRelativeTime(secondsAgo(-3600), NOW)).toBe('agora');
  });

  it('formata minutos', () => {
    expect(formatRelativeTime(secondsAgo(60), NOW)).toBe('há 1 min');
    expect(formatRelativeTime(secondsAgo(5 * 60), NOW)).toBe('há 5 min');
  });

  it('formata horas', () => {
    expect(formatRelativeTime(secondsAgo(60 * 60), NOW)).toBe('há 1 h');
    expect(formatRelativeTime(secondsAgo(3 * 60 * 60), NOW)).toBe('há 3 h');
  });

  it('formata dias', () => {
    expect(formatRelativeTime(secondsAgo(24 * 60 * 60), NOW)).toBe('há 1 d');
    expect(formatRelativeTime(secondsAgo(2 * 24 * 60 * 60), NOW)).toBe('há 2 d');
  });

  it('formata meses (singular e plural)', () => {
    expect(formatRelativeTime(secondsAgo(45 * 24 * 60 * 60), NOW)).toBe('há 1 mês');
    expect(formatRelativeTime(secondsAgo(90 * 24 * 60 * 60), NOW)).toBe('há 3 meses');
  });

  it('formata anos (singular e plural)', () => {
    expect(formatRelativeTime(secondsAgo(400 * 24 * 60 * 60), NOW)).toBe('há 1 ano');
    expect(formatRelativeTime(secondsAgo(800 * 24 * 60 * 60), NOW)).toBe('há 2 anos');
  });

  it('aceita Date e epoch ms como entrada e now', () => {
    expect(formatRelativeTime(new Date(secondsAgo(120)), new Date(NOW))).toBe('há 2 min');
    expect(formatRelativeTime(secondsAgo(120), NOW.getTime())).toBe('há 2 min');
  });
});
