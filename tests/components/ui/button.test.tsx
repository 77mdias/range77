// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

/**
 * SUITE TDD — Button: variantes, tamanhos, clique, loading e disabled.
 * Ambiente jsdom (interação real com o DOM).
 */

afterEach(cleanup);

describe('Button', () => {
  it('renderiza os filhos e type=button por padrão', () => {
    render(<Button>Buscar</Button>);
    const button = screen.getByRole('button', { name: 'Buscar' });
    expect(button.getAttribute('type')).toBe('button');
  });

  it('aplica as classes de variante', () => {
    const { rerender } = render(<Button>P</Button>);
    expect(screen.getByRole('button').className).toContain('bg-accent');

    rerender(<Button variant="secondary">S</Button>);
    expect(screen.getByRole('button').className).toContain('border-text-primary');

    rerender(<Button variant="ghost">G</Button>);
    expect(screen.getByRole('button').className).toContain('bg-transparent');
  });

  it('aplica o efeito de press (compressão no clique)', () => {
    render(<Button>Press</Button>);
    const className = screen.getByRole('button').className;
    expect(className).toContain('rounded-md');
    expect(className).toContain('active:scale-[0.98]');
  });

  it('dispara onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Ok</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('não dispara onClick quando disabled', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Off
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('loading desabilita, expõe aria-busy e mostra o spinner', () => {
    render(<Button loading>Enviando</Button>);
    const button = screen.getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('button-spinner')).toBeTruthy();
  });

  it('mescla className extra', () => {
    render(<Button className="extra">X</Button>);
    expect(screen.getByRole('button').className).toContain('extra');
  });
});
