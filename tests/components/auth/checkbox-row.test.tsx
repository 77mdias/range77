import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CheckboxRow } from '@/components/auth/checkbox-row';

describe('CheckboxRow', () => {
  it('liga label e input, com hint mono opcional', () => {
    const html = renderToStaticMarkup(
      <CheckboxRow
        id="remember"
        label="Manter sessão segura neste terminal (30 dias)"
        hint="PERSISTENT_AUTH"
        defaultChecked
      />,
    );
    expect(html).toContain('data-checkbox-row="remember"');
    expect(html).toContain('for="remember"');
    expect(html).toContain('PERSISTENT_AUTH');
    expect(html).toContain('checked');
    expect(html).toContain('peer'); // o check visual depende de peer-checked
  });
});
