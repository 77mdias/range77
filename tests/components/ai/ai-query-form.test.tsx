import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AiQueryForm } from '@/components/ai';

describe('AiQueryForm', () => {
  it('renderiza textarea, atalho, modelo e botão', () => {
    const html = renderToStaticMarkup(
      <AiQueryForm model="MINIMAX-VAL-03" tokenMeta="PROMPT TOKEN: 4.2k" onSubmit={() => {}} />,
    );
    expect(html).toContain('data-component="ai-query-form"');
    expect(html).toContain('Ctrl+Enter');
    expect(html).toContain('MINIMAX-VAL-03');
    expect(html).toContain('PROMPT TOKEN: 4.2k');
    expect(html).toContain('Enviar consulta');
  });

  it('sem resposta não renderiza painel', () => {
    const html = renderToStaticMarkup(<AiQueryForm model="M" onSubmit={() => {}} />);
    expect(html).not.toContain('data-ai-response');
  });

  it('com resposta exibe painel e meta', () => {
    const html = renderToStaticMarkup(
      <AiQueryForm
        model="M"
        onSubmit={() => {}}
        response="Sua taxa de primeiro sangue está 12% acima do elo."
        responseMeta="LATÊNCIA: 180MS"
      />,
    );
    expect(html).toContain('data-ai-response');
    expect(html).toContain('12% acima do elo');
    expect(html).toContain('LATÊNCIA: 180MS');
  });

  it('loading aplica estilo itálico e aria-busy', () => {
    const html = renderToStaticMarkup(
      <AiQueryForm
        model="M"
        onSubmit={() => {}}
        loading
        response="Sintetizando camadas..."
      />,
    );
    expect(html).toContain('italic');
    expect(html).toContain('aria-busy="true"');
  });
});
