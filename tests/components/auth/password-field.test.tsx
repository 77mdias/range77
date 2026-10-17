// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PasswordField } from '@/components/auth/password-field';

afterEach(cleanup);

describe('PasswordField', () => {
  it('começa oculto e alterna a visibilidade', () => {
    render(<PasswordField id="pwd" label="Senha de Acesso" />);
    const toggle = screen.getByRole('button', { name: 'Alternar visibilidade de senha' });
    expect(screen.getByLabelText('Senha de Acesso').getAttribute('type')).toBe('password');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Senha de Acesso').getAttribute('type')).toBe('text');
    fireEvent.click(toggle);
    expect(screen.getByLabelText('Senha de Acesso').getAttribute('type')).toBe('password');
  });

  it('sem medidor não renderiza barras', () => {
    const { container } = render(<PasswordField id="pwd" label="Senha" />);
    expect(container.querySelector('[data-password-strength]')).toBeNull();
  });

  it('com medidor, o score segue os critérios cumpridos', () => {
    const { container } = render(
      <PasswordField id="pwd" label="Senha" showStrength defaultValue="segred0!valcoach" />,
    );
    expect(container.querySelector('[data-password-strength]')?.getAttribute('data-score')).toBe('3');
    const bars = container.querySelectorAll('[data-strength-bar]');
    expect(bars.length).toBe(3);
    expect(container.querySelectorAll('[data-strength-bar][data-met]').length).toBe(3);
  });

  it('atualiza o medidor ao digitar', () => {
    const { container } = render(<PasswordField id="pwd" label="Senha" showStrength />);
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'abcdefgh' } });
    expect(container.querySelector('[data-password-strength]')?.getAttribute('data-score')).toBe('1');
    expect(container.querySelectorAll('[data-strength-bar][data-met]').length).toBe(1);
  });
});
