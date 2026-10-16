// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouteError } from '@/components/layout/route-error';

/**
 * SUITE TDD — card de erro de ROTA compartilhado pelas duas fronteiras
 * (`app/error.tsx` e `(app)/error.tsx`). O card é o mesmo de antes; o que se
 * testa aqui é o COMPORTAMENTO: alerta acessível + hook `data-app-error`,
 * retry ligado ao `retry` do Next 16 e `digest` condicional.
 */

// O card loga o erro no console do cliente de propósito (`useEffect`), então
// cada render sujaria o stderr da suíte. O spy é instalado ANTES do render —
// o efeito dispara no mount — e a asserção sobre ele fixa que o diagnóstico
// continua acontecendo; silenciar sem verificar seria só mordaça.
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

const errorWithoutDigest = Object.assign(new Error('boom'), { digest: undefined });

describe('RouteError', () => {
  it('renderiza o alerta e o hook data-app-error com o título em português', () => {
    render(<RouteError error={errorWithoutDigest} retry={vi.fn()} />);

    expect(document.querySelector('[data-app-error]')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Erro · 500')).toBeTruthy();
    expect(screen.getByText('Algo saiu do eixo nesta rota')).toBeTruthy();

    // O diagnóstico no console é comportamento deliberado do card.
    expect(consoleError).toHaveBeenCalledWith(errorWithoutDigest);
  });

  it('clicar em "Tentar novamente" chama retry exatamente uma vez', () => {
    const retry = vi.fn();
    render(<RouteError error={errorWithoutDigest} retry={retry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('renderiza o digest quando presente', () => {
    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    render(<RouteError error={error} retry={vi.fn()} />);

    expect(screen.getByText('Ref: abc123')).toBeTruthy();
  });

  it('omite a linha do digest quando ausente', () => {
    render(<RouteError error={errorWithoutDigest} retry={vi.fn()} />);

    expect(screen.queryByText(/^Ref:/)).toBeNull();
  });
});
