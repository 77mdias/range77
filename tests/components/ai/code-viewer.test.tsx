import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeViewer } from '@/components/ai';
import { tokenizeJson } from '@/components/ai/highlight';

describe('tokenizeJson', () => {
  it('classifica chaves, strings, números e literais', () => {
    const tokens = tokenizeJson('{"a":"b","n":1,"ok":true,"x":null}');
    const kinds = tokens.map((token) => token.kind);
    expect(kinds).toContain('key');
    expect(kinds).toContain('string');
    expect(kinds).toContain('number');
    expect(kinds).toContain('literal');
  });

  it('preserva texto fora de tokens (pontuação)', () => {
    const tokens = tokenizeJson('{ }');
    const concatenated = tokens.map((token) => token.text).join('');
    expect(concatenated).toBe('{ }');
  });

  it('string vazia retorna nenhum token', () => {
    expect(tokenizeJson('')).toEqual([]);
  });
});

describe('CodeViewer', () => {
  it('renderiza titlebar com filename e badge', () => {
    const html = renderToStaticMarkup(
      <CodeViewer filename="layer3.coaching.json" code={'{"ok":true}'} />,
    );
    expect(html).toContain('data-component="code-viewer"');
    expect(html).toContain('layer3.coaching.json');
    expect(html).toContain('UTF-8 • JSON válido');
  });

  it('aplica classes de highlight por tipo de token', () => {
    const html = renderToStaticMarkup(
      <CodeViewer filename="x.json" code={'{"k":"v","n":1}'} />,
    );
    expect(html).toContain('font-semibold text-text-primary');
    expect(html).toContain('text-win');
  });

  it('renderiza actions (copiar/exportar/simular)', () => {
    const html = renderToStaticMarkup(
      <CodeViewer
        filename="x.json"
        code="{}"
        actions={[
          { label: 'Copiar Payload', icon: 'copy', onSelect: () => {} },
          { label: 'Simular nova partida', icon: 'refresh', variant: 'primary', onSelect: () => {} },
        ]}
      />,
    );
    expect(html).toContain('Copiar Payload');
    expect(html).toContain('Simular nova partida');
    expect(html).toContain('bg-accent');
  });
});
