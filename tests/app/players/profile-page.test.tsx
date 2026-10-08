import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * SUITE TDD — página do perfil: validação de params (branch síncrona) sem
 * tocar a camada de dados. Os serviços são mockados (sem rede/DB).
 */

vi.mock('@/lib/cache/tracker', () => ({ getCachedPlayerOverview: vi.fn() }));

import PlayerPage from '@/app/players/[region]/[name]/[tag]/page';

const render = async (region: string, name: string, tag: string) => {
  const element = await PlayerPage({
    params: Promise.resolve({ region, name, tag }),
  });
  return renderToStaticMarkup(element);
};

describe('PlayerPage', () => {
  it('região inválida → ErrorState INVALID_PARAMS', async () => {
    const html = await render('mars', 'Player', 'BR1');
    expect(html).toContain('INVALID_PARAMS');
    expect(html).toContain('Região inválida');
  });

  it('nome vazio → ErrorState INVALID_PARAMS', async () => {
    expect(await render('br', '', 'BR1')).toContain('INVALID_PARAMS');
  });

  it('tag inválida → ErrorState INVALID_PARAMS', async () => {
    expect(await render('br', 'Player', 'a!b')).toContain('INVALID_PARAMS');
  });
});
