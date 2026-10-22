import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NavSearch, resolveSearchTarget } from '@/components/layout/nav-search';

/**
 * SUITE — NavSearch (busca rápida do header, fiel ao Stitch): renderização
 * do campo + badge de região e a rota gerada a partir de `Nome#Tag`
 * (puro, compartilhado com o fluxo de ingestão da home).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('NavSearch', () => {
  it('renderiza campo com placeholder do Stitch e badge de região', () => {
    const html = renderToStaticMarkup(<NavSearch />);
    expect(html).toContain('data-nav-search');
    expect(html).toContain('Player#Tag (ex: ValCoachDemo#DEMO)');
    expect(html).not.toContain('Tenz');
    expect(html).toContain('>BR</option>');
    expect(html).toContain('>LATAM</option>');
  });

  it('some abaixo de md (sem busca no header mobile, como no Stitch)', () => {
    expect(renderToStaticMarkup(<NavSearch />)).toContain('hidden md:block');
  });

  it('sem erro não renderiza alerta', () => {
    expect(renderToStaticMarkup(<NavSearch />)).not.toContain('role="alert"');
  });
});

describe('resolveSearchTarget', () => {
  it('Riot ID válido → rota do perfil + riotId canônico, com região e encoding', () => {
    expect(resolveSearchTarget('br', 'TenZ#0001')).toEqual({
      ok: true,
      href: '/players/br/TenZ/0001',
      riotId: 'TenZ#0001',
    });
    const spaced = resolveSearchTarget('latam', '  Nome Da Silva #tag1  ');
    expect(spaced.ok).toBe(true);
    if (spaced.ok) {
      expect(spaced.riotId).toBe('Nome Da Silva#tag1');
    }
  });

  it('Riot ID inválido → mensagem de erro, sem href', () => {
    const result = resolveSearchTarget('br', 'sem-tag');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('Nome#Tag');
    }
  });
});
