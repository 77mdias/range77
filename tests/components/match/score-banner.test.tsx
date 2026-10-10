import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScoreBanner } from '@/components/match';

describe('ScoreBanner', () => {
  it('destaca o placar do vencedor e exibe halves', () => {
    const html = renderToStaticMarkup(
      <ScoreBanner result="win" scoreTeam={13} scoreEnemy={9} map="Ascent" halves="DEF: 7-5 • ATK: 6-4" />,
    );
    expect(html).toContain('data-component="score-banner"');
    expect(html).toContain('13');
    expect(html).toContain('Vitória');
    expect(html).toContain('DEF: 7-5 • ATK: 6-4');
  });

  it('na derrota o placar do time fica secundário', () => {
    const html = renderToStaticMarkup(
      <ScoreBanner result="loss" scoreTeam={9} scoreEnemy={13} map="Haven" />,
    );
    expect(html).toContain('Derrota');
    expect(html).not.toContain('Vitória');
  });

  it('sem imagem renderiza sigla do mapa na thumbnail', () => {
    const html = renderToStaticMarkup(
      <ScoreBanner result="win" scoreTeam={13} scoreEnemy={9} map="Ascent" />,
    );
    expect(html).toContain('Asc');
    expect(html).toContain('Ascent');
  });
});
