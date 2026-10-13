// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

/**
 * SUITE TDD — RateLimitWait: tela de espera do rate limit da HenrikDev.
 * Contagem regressiva real, re-render da rota ao zerar (auto-retry) e
 * re-arme quando o servidor entrega um novo `retryAfterSeconds`.
 */

const refresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { RateLimitWait } from '@/components/ui/states';

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('RateLimitWait', () => {
  it('mostra a contagem regressiva a partir do retryAfterSeconds', () => {
    render(<RateLimitWait retryAfterSeconds={12} />);

    expect(screen.getByText('12s')).toBeTruthy();
    expect(screen.getByText(/Limite de consultas/i)).toBeTruthy();
  });

  it('usa 60s quando o header de reset não chegou', () => {
    render(<RateLimitWait />);

    expect(screen.getByText('60s')).toBeTruthy();
  });

  it('decrementa a cada segundo', () => {
    render(<RateLimitWait retryAfterSeconds={3} />);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText('2s')).toBeTruthy();
  });

  it('ao zerar, re-renderiza a rota no servidor (auto-retry)', () => {
    render(<RateLimitWait retryAfterSeconds={2} />);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('re-arma a contagem quando o servidor manda um novo valor', () => {
    const { rerender } = render(<RateLimitWait retryAfterSeconds={5} />);

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText('4s')).toBeTruthy();

    rerender(<RateLimitWait retryAfterSeconds={20} />);

    expect(screen.getByText('20s')).toBeTruthy();
  });

  it('o botão "Tentar agora" re-renderiza a rota imediatamente', () => {
    render(<RateLimitWait retryAfterSeconds={30} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar agora' }));

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
