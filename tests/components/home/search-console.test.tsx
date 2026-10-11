import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SearchConsole } from '@/components/home';

describe('SearchConsole', () => {
  it('renderiza terminal com título padrão e corpo', () => {
    const html = renderToStaticMarkup(
      <SearchConsole>
        <form data-search-form />
      </SearchConsole>,
    );
    expect(html).toContain('data-component="search-console"');
    expect(html).toContain('Terminal de consulta telemétrica');
    expect(html).toContain('data-search-form');
  });

  it('exibe chip de status e rodapé helper', () => {
    const html = renderToStaticMarkup(
      <SearchConsole statusChip="STATUS: AGUARDANDO INPUT" helperText="3-layer pipeline pronto">
        <span>X</span>
      </SearchConsole>,
    );
    expect(html).toContain('STATUS: AGUARDANDO INPUT');
    expect(html).toContain('3-layer pipeline pronto');
  });

  it('sombra dura é opt-in', () => {
    expect(
      renderToStaticMarkup(
        <SearchConsole hardShadow>
          <span>X</span>
        </SearchConsole>,
      ),
    ).toContain('shadow-hard-4');
    expect(
      renderToStaticMarkup(
        <SearchConsole>
          <span>X</span>
        </SearchConsole>,
      ),
    ).not.toContain('shadow-hard');
  });
});
