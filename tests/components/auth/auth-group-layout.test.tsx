import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/login' }));

import AuthLayout from '@/app/(auth)/layout';

describe('AuthLayout', () => {
  it('envolve o filho com header e footer de auth, e um main próprio', () => {
    const html = renderToStaticMarkup(
      <AuthLayout>
        <span data-child />
      </AuthLayout>,
    );
    expect(html).toContain('data-auth-header');
    expect(html).toContain('data-auth-footer');
    expect(html).toContain('<main');
    expect(html).toContain('data-child');
    expect(html).not.toContain('data-component="app-shell"');
  });
});
