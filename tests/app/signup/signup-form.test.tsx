// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

type SignUpResult = { error: { code?: string } | null };
type LinkResult = { ok: boolean; error?: string; message: string };

const signUpEmail = vi.fn(async (): Promise<SignUpResult> => ({ error: null }));
const linkRiotAccount = vi.fn(
  async (): Promise<LinkResult> => ({ ok: true, message: 'vinculado' }),
);
const push = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-client', () => ({
  authClient: { signUp: { email: (...args: unknown[]) => signUpEmail(...(args as [])) } },
}));
vi.mock('@/app/actions/user-riot', () => ({
  linkRiotAccount: (...args: unknown[]) => linkRiotAccount(...(args as [])),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { SignupForm } from '@/app/(auth)/signup/signup-form';

afterEach(() => {
  cleanup();
  signUpEmail.mockClear();
  linkRiotAccount.mockClear();
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
  fireEvent.change(screen.getByLabelText('04 // SENHA DE ACESSO'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('05 // CONFIRMAR SENHA'), { target: { value: password } });
}

function acceptTerms(): void {
  fireEvent.click(screen.getByLabelText(/Concordo com os/));
}

describe('SignupForm', () => {
  it('cria a conta e navega SEM callbackURL (o redirect do Better Auth atropelaria o vínculo do Riot ID)', async () => {
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
    expect(linkRiotAccount).not.toHaveBeenCalled();
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
    fireEvent.change(screen.getByLabelText('05 // CONFIRMAR SENHA'), {
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

  it('rejeita Riot ID malformado antes de criar a conta', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/03 \/\/ RIOT ID INICIAL/), {
      target: { value: 'sem-cerquilha' },
    });
    acceptTerms();
    fireEvent.submit(form());

    expect(signUpEmail).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Nome#Tag');
  });

  it('com Riot ID válido, vincula depois do cadastro e então navega', async () => {
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/03 \/\/ RIOT ID INICIAL/), {
      target: { value: 'Aspas#LEV' },
    });
    fireEvent.change(screen.getByLabelText(/REGIÃO/), { target: { value: 'na' } });
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(linkRiotAccount).toHaveBeenCalledTimes(1));
    expect(linkRiotAccount).toHaveBeenCalledWith({ region: 'na', name: 'Aspas', tag: 'LEV' });
    expect(signUpEmail.mock.invocationCallOrder[0]).toBeLessThan(
      linkRiotAccount.mock.invocationCallOrder[0] ?? 0,
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });

  it('falha no vínculo não invalida a conta: vai para settings', async () => {
    linkRiotAccount.mockResolvedValueOnce({ ok: false, error: 'UNAUTHENTICATED', message: 'x' });
    render(<SignupForm callbackPath="/dashboard" />);
    fillBase();
    fireEvent.change(screen.getByLabelText(/03 \/\/ RIOT ID INICIAL/), {
      target: { value: 'Aspas#LEV' },
    });
    acceptTerms();
    fireEvent.submit(form());

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/settings'));
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

  it('oferece as 6 afinidades reais como região', () => {
    render(<SignupForm callbackPath="/dashboard" />);
    for (const affinity of ['br', 'latam', 'na', 'eu', 'ap', 'kr']) {
      expect(screen.getByRole('option', { name: new RegExp(`REGIÃO: ${affinity}`, 'i') })).toBeTruthy();
    }
  });
});
