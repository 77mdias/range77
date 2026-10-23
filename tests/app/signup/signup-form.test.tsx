// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

type SignUpResult = { error: { code?: string } | null };

const signUpEmail = vi.fn(async (): Promise<SignUpResult> => ({ error: null }));
const push = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-client', () => ({
  authClient: { signUp: { email: (...args: unknown[]) => signUpEmail(...(args as [])) } },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { SignupForm } from '@/app/(auth)/signup/signup-form';

afterEach(() => {
  cleanup();
  signUpEmail.mockClear();
  push.mockClear();
});

function form(): HTMLFormElement {
  const element = document.querySelector<HTMLFormElement>('form[data-signup-form]');
  if (element === null) throw new Error('form data-signup-form não encontrado');
  return element;
}

function fillBase(password = 'segred0!valcoach'): void {
  fireEvent.change(screen.getByLabelText('01 // NOME DE OPERADOR / USUÁRIO'), {
    target: { value: '  Coach  ' },
  });
  fireEvent.change(screen.getByLabelText('02 // E-MAIL DE TRABALHO OU PESSOAL'), {
    target: { value: 'coach@valcoach.dev' },
  });
  fireEvent.change(screen.getByLabelText('03 // SENHA DE ACESSO'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('04 // CONFIRMAR SENHA'), { target: { value: password } });
}

function acceptTerms(): void {
  fireEvent.click(screen.getByLabelText(/Concordo com os/));
}

describe('SignupForm', () => {
  it('cria a conta e navega SEM callbackURL (o redirect do Better Auth atropelaria a navegação explícita)', async () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(signUpEmail).toHaveBeenCalledTimes(1));
    expect(signUpEmail).toHaveBeenCalledWith({
      name: 'Coach',
      email: 'coach@valcoach.dev',
      password: 'segred0!valcoach',
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('rejeita senha curta antes de chamar a API', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase('1234567');
    acceptTerms();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('A senha deve ter de');
  });

  it('rejeita confirmação divergente antes de chamar a API', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText('04 // CONFIRMAR SENHA'), {
      target: { value: 'outraSenha1!' },
    });
    acceptTerms();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('As senhas não coincidem.');
  });

  it('exige o aceite dos termos', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('termos');
  });

  it('mensagem específica para e-mail já cadastrado', async () => {
    signUpEmail.mockResolvedValueOnce({ error: { code: 'USER_ALREADY_EXISTS' } });
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('já está cadastrado'));
    expect(push).not.toHaveBeenCalled();
  });

  it('não coleta Riot ID nem região (o vínculo nasce só do RSO, em Configurações)', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    expect(document.querySelector('input[name="riotId"]')).toBeNull();
    expect(document.querySelector('select[name="region"]')).toBeNull();
    expect(screen.queryByText(/RIOT ID/i)).toBeNull();
  });
});
