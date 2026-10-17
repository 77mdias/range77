import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Field } from '@/components/auth/field';

describe('Field', () => {
  it('liga label e input pelo id, com hint mono', () => {
    const html = renderToStaticMarkup(
      <Field id="identifier" label="E-mail" hint="RFC 822" placeholder="agente@valorant.coach" />,
    );
    expect(html).toContain('data-field="identifier"');
    expect(html).toContain('for="identifier"');
    expect(html).toContain('id="identifier"');
    expect(html).toContain('agente@valorant.coach');
    expect(html).toContain('RFC 822');
  });

  it('renderiza ícone e addon, reservando padding para ambos', () => {
    const html = renderToStaticMarkup(
      <Field id="pwd" label="Senha" icon="eye" addon={<span data-addon />} />,
    );
    expect(html).toContain('data-icon="eye"');
    expect(html).toContain('data-addon');
    expect(html).toContain('pl-7'); // R2: impl usa pl-7 (icon 22px + pl-7=28px)
    expect(html).toContain('pr-10');
  });

  it('repassa aria-invalid e aria-describedby do formulário', () => {
    const html = renderToStaticMarkup(
      <Field id="e" label="E-mail" aria-invalid aria-describedby="err" />,
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="err"');
  });
});
