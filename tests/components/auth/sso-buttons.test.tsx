// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const signInSocial = vi.fn(
  async (): Promise<{ error: { code?: string } | null }> => ({ error: null }),
);
vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { social: (...args: unknown[]) => signInSocial(...(args as [])) } },
}));

import { SsoButtons } from '@/components/auth/sso-buttons';

afterEach(() => {
  cleanup();
  signInSocial.mockClear();
});

describe('SsoButtons', () => {
  it('renderiza os rótulos de login por padrão, com as marcas', () => {
    const { container } = render(<SsoButtons callbackPath="/dashboard" />);
    expect(container.querySelector('[data-social-login]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Continuar com Google/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Continuar com Discord/ })).toBeTruthy();
    expect(container.querySelector('[data-brand="google"]')).not.toBeNull();
    expect(container.querySelector('[data-brand="discord"]')).not.toBeNull();
  });

  it('aceita os rótulos de cadastro e o badge do Discord', () => {
    render(
      <SsoButtons
        callbackPath="/dashboard"
        labels={{ google: 'Cadastrar com Google', discord: 'Cadastrar com Discord' }}
        discordBadge="COMMUNITY"
      />,
    );
    expect(screen.getByRole('button', { name: /Cadastrar com Google/ })).toBeTruthy();
    expect(screen.getByText('COMMUNITY')).toBeTruthy();
  });

  it('chama signIn.social com callbackURL', async () => {
    render(<SsoButtons callbackPath="/console" />);
    fireEvent.click(screen.getByRole('button', { name: /Continuar com Google/ }));
    await waitFor(() => expect(signInSocial).toHaveBeenCalledTimes(1));
    expect(signInSocial).toHaveBeenCalledWith({ provider: 'google', callbackURL: '/console' });
  });

  it('expõe erro quando o provedor recusa', async () => {
    signInSocial.mockResolvedValueOnce({ error: { code: 'X' } });
    render(<SsoButtons callbackPath="/dashboard" />);
    fireEvent.click(screen.getByRole('button', { name: /Continuar com Discord/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });
});
