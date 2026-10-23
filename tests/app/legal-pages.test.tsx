import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PrivacidadePage from '@/app/(app)/privacidade/page';
import TermosPage from '@/app/(app)/termos/page';

describe('páginas legais', () => {
  it('termos traz o título e o aviso da Riot', () => {
    const html = renderToStaticMarkup(<TermosPage />);
    expect(html).toContain('Termos de Uso');
    expect(html).toContain('trademarks or registered trademarks of Riot Games, Inc.');
  });

  it('privacidade descreve dados, privacidade do perfil, desvínculo e exclusão', () => {
    const html = renderToStaticMarkup(<PrivacidadePage />);
    expect(html).toContain('Política de Privacidade');
    expect(html).toContain('PUUID');
    expect(html).toContain('Tornar meu perfil');
    expect(html).toContain('Desvincular conta Riot');
    expect(html).toContain('contato@');
  });

  it('não aninham <main> (o AppShell já fornece o landmark)', () => {
    for (const Page of [TermosPage, PrivacidadePage]) {
      expect(renderToStaticMarkup(<Page />)).not.toContain('<main');
    }
  });
});
