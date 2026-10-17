import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({ usePathname: () => '/login' }));

import { AuthHeader } from '@/components/auth/auth-header';

describe('AuthHeader', () => {
  it('mostra marca, badge SYS_AUTH, telemetria, tabs e ponte para a home', () => {
    const html = renderToStaticMarkup(<AuthHeader />);
    expect(html).toContain('data-auth-header');
    expect(html).toContain('VALORANT');
    expect(html).toContain('.COACH');
    expect(html).toContain('SYS_AUTH');
    expect(html).toContain('RIOT API // SECURE V4');
    expect(html).toContain('SSL 256-BIT ENCRYPTION');
    expect(html).toContain('RTT &lt;15MS');
    expect(html).toContain('STATUS: READY');
    expect(html).toContain('href="/"');
  });
});
