// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const signInEmail = vi.fn(
  async (): Promise<{ error: { code?: string } | null }> => ({ error: null }),
);
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: (...args: unknown[]) => signInEmail(...(args as [])) } },
}));

import { LoginForm } from '@/app/(auth)/login/login-form';

afterEach(() => {
  cleanup();
  signInEmail.mockClear();
});

function form(): HTMLFormElement {
  const element = document.querySelector<HTMLFormElement>('form[data-email-login]');
  if (element === null) throw new Error('form data-email-login não encontrado');
  return element;
}

function fill(email: string, password: string): void {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Senha de Acesso'), { target: { value: password } });
}

describe('LoginForm', () => {
  it('envia rememberMe marcado por padrão, com callbackURL', async () => {
    render(<LoginForm callbackPath="/dashboard" />);
    fill('  Coach@ValCoach.dev ', 'segred0!valcoach');
    fireEvent.submit(form());

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail).toHaveBeenCalledWith({
      email: 'coach@valcoach.dev',
      password: 'segred0!valcoach',
      rememberMe: true,
      callbackURL: '/dashboard',
    });
  });

  it('desmarcar o checkbox envia rememberMe=false', async () => {
    render(<LoginForm callbackPath="/dashboard" />);
    fill('coach@valcoach.dev', 'segred0!valcoach');
    fireEvent.click(screen.getByLabelText(/Manter sessão/));
    fireEvent.submit(form());

    await waitFor(() => expect(signInEmail).toHaveBeenCalledTimes(1));
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ rememberMe: false }),
    );
  });

  it('bloqueia envio com email inválido, sem chamar a API', () => {
    render(<LoginForm callbackPath="/dashboard" />);
    fill('sem-arroba', 'segred0!valcoach');
    fireEvent.submit(form());

    expect(signInEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('e-mail');
  });

  it('mostra erro genérico quando o servidor recusa as credenciais', async () => {
    signInEmail.mockResolvedValueOnce({ error: { code: 'INVALID_PASSWORD' } });
    render(<LoginForm callbackPath="/dashboard" />);
    fill('coach@valcoach.dev', 'segred0!valcoach');
    fireEvent.submit(form());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('incorretos'));
  });

  it('mostra o link de reset como pendência explícita', () => {
    render(<LoginForm callbackPath="/dashboard" />);
    expect(screen.getByRole('link', { name: 'Esqueceu a senha?' }).getAttribute('href')).toBe('#');
  });
});
