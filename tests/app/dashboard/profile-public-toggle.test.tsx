// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

/** SUITE TDD — toggle "Tornar meu perfil público" chama a Server Action. */

const setProfilePublic = vi.hoisted(() =>
  vi.fn(async (_value: boolean) => ({ ok: true, message: 'ok' }) as { ok: boolean; message: string }),
);

vi.mock('@/app/actions/user-riot', () => ({ setProfilePublic }));

import { ProfilePublicToggle } from '@/app/(app)/dashboard/settings/profile-public-toggle';

afterEach(() => {
  cleanup();
  setProfilePublic.mockClear();
});

function checkbox(): HTMLInputElement {
  return screen.getByLabelText('Tornar meu perfil público') as HTMLInputElement;
}

describe('ProfilePublicToggle', () => {
  it('reflete o estado inicial', () => {
    render(<ProfilePublicToggle initialValue />);
    expect(checkbox().checked).toBe(true);
  });

  it('ligar chama setProfilePublic(true)', async () => {
    render(<ProfilePublicToggle initialValue={false} />);
    fireEvent.click(checkbox());

    await waitFor(() => expect(setProfilePublic).toHaveBeenCalledWith(true));
    expect(checkbox().checked).toBe(true);
  });

  it('falha da action desfaz o toggle e mostra a mensagem', async () => {
    setProfilePublic.mockResolvedValueOnce({ ok: false, message: 'Conecte com Riot.' });
    render(<ProfilePublicToggle initialValue />);
    fireEvent.click(checkbox());

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Conecte com Riot.'));
    expect(setProfilePublic).toHaveBeenCalledWith(false);
    expect(checkbox().checked).toBe(true);
  });
});
