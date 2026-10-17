// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ value: '/login' }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }));

import { AuthTabs } from '@/components/auth/auth-tabs';

afterEach(cleanup);

describe('AuthTabs', () => {
  it('marca a aba ativa conforme o pathname', () => {
    pathname.value = '/login';
    render(<AuthTabs />);
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Criar Conta' }).getAttribute('aria-current')).toBeNull();
  });

  it('troca a aba ativa no cadastro', () => {
    pathname.value = '/signup';
    render(<AuthTabs />);
    expect(screen.getByRole('link', { name: 'Criar Conta' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('aria-current')).toBeNull();
  });

  it('aponta para as rotas reais', () => {
    pathname.value = '/login';
    render(<AuthTabs />);
    expect(screen.getByRole('link', { name: 'Entrar' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Criar Conta' }).getAttribute('href')).toBe('/signup');
  });
});
