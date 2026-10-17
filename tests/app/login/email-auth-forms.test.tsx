// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignupForm } from '@/app/(auth)/login/email-auth-forms';

/**
 * SUITE TDD — formulários manuais de auth (login/signup email+senha).
 * O auth-client é mockado: asserções verificam o contrato de chamada
 * (`signIn.email`/`signUp.email` com valores normalizados e callbackURL)
 * e a superfície de erro.
 */

type AuthCallResult = { error: { code: string } | null };

const signUpEmail = vi.fn<(...args: unknown[]) => Promise<AuthCallResult>>(
  async () => ({ error: null }),
);

vi.mock('@/lib/auth-client', () => ({
  authClient: {
    signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
  },
}));

afterEach(() => {
  cleanup();
  signUpEmail.mockClear();
});

function getForm(container: HTMLElement, marker: string): HTMLFormElement {
  const form = container.querySelector<HTMLFormElement>(`form[data-${marker}]`);
  if (form === null) {
    throw new Error(`form ${marker} não encontrado`);
  }
  return form;
}

describe('SignupForm', () => {
  it('chama signUp.email com nome/email/senha validados', async () => {
    const { container } = render(<SignupForm callbackPath="/dashboard" />);

    fireEvent.change(screen.getByPlaceholderText('Como quer ser chamado'), {
      target: { value: '  Coach  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('nome@dominio.com'), {
      target: { value: 'coach@valcoach.dev' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo de 8 caracteres'), {
      target: { value: 'segred0!valcoach' },
    });
    fireEvent.submit(getForm(container, 'signup-form'));

    await waitFor(() => expect(signUpEmail).toHaveBeenCalledTimes(1));
    expect(signUpEmail).toHaveBeenCalledWith({
      name: 'Coach',
      email: 'coach@valcoach.dev',
      password: 'segred0!valcoach',
      callbackURL: '/dashboard',
    });
  });

  it('rejeita senha curta antes de chamar a API', () => {
    const { container } = render(<SignupForm callbackPath="/dashboard" />);

    fireEvent.change(screen.getByPlaceholderText('Como quer ser chamado'), {
      target: { value: 'Coach' },
    });
    fireEvent.change(screen.getByPlaceholderText('nome@dominio.com'), {
      target: { value: 'coach@valcoach.dev' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo de 8 caracteres'), {
      target: { value: '1234567' },
    });
    fireEvent.submit(getForm(container, 'signup-form'));

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('A senha deve ter de');
  });

  it('mensagem específica para e-mail já cadastrado', async () => {
    signUpEmail.mockResolvedValueOnce({ error: { code: 'USER_ALREADY_EXISTS' } });
    const { container } = render(<SignupForm callbackPath="/dashboard" />);

    fireEvent.change(screen.getByPlaceholderText('Como quer ser chamado'), {
      target: { value: 'Coach' },
    });
    fireEvent.change(screen.getByPlaceholderText('nome@dominio.com'), {
      target: { value: 'coach@valcoach.dev' },
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo de 8 caracteres'), {
      target: { value: 'segred0!valcoach' },
    });
    fireEvent.submit(getForm(container, 'signup-form'));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('já está cadastrado');
  });
});
