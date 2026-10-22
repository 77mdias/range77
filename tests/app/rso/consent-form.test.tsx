// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const actions = vi.hoisted(() => ({
  authorizeRso: vi.fn(async () => '/api/rso/callback?code=c&state=s'),
  denyRso: vi.fn(async () => undefined),
}));
vi.mock('@/app/actions/rso', () => actions);

import { ConsentForm } from '@/app/(auth)/rso/consent/consent-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ConsentForm', () => {
  it('Autorizar navega (documento) para a URL devolvida pela action', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    render(<ConsentForm state="s" region="br" />);
    fireEvent.click(screen.getByRole('button', { name: 'Autorizar' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('/api/rso/callback?code=c&state=s'));
    expect(actions.authorizeRso).toHaveBeenCalledWith('s', 'br');
  });

  it('Negar chama denyRso', async () => {
    render(<ConsentForm state="s" region="br" />);
    fireEvent.click(screen.getByRole('button', { name: 'Negar' }));
    await waitFor(() => expect(actions.denyRso).toHaveBeenCalled());
  });
});
