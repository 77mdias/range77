import { describe, expect, it } from 'vitest';
import { resolveCallbackPath } from '@/components/auth/resolve-callback-path';

describe('resolveCallbackPath', () => {
  it('preserva caminhos internos', () => {
    expect(resolveCallbackPath('/players/br/tenz/0001')).toBe('/players/br/tenz/0001');
  });

  it('cai no dashboard sem valor, com array ou com destino externo', () => {
    expect(resolveCallbackPath(undefined)).toBe('/dashboard');
    expect(resolveCallbackPath(['/dashboard', '/admin'])).toBe('/dashboard');
    expect(resolveCallbackPath('https://evil.example')).toBe('/dashboard');
    expect(resolveCallbackPath('//evil.example')).toBe('/dashboard');
  });

  it('não vaza barra invertida como prefixo de URL', () => {
    expect(resolveCallbackPath('/\\evil.example')).toBe('/dashboard');
  });
});
