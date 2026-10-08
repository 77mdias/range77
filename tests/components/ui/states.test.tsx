import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmptyState, ErrorState } from '@/components/ui/states';

/**
 * SUITE TDD — estados vazios/erro. ErrorState consome o envelope
 * `ApiErrorBody` (code/message/hint).
 */

describe('EmptyState', () => {
  it('renderiza título, descrição e ação', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Sem partidas" description="Nada por aqui." action={<button>Atualizar</button>} />,
    );
    expect(html).toContain('data-state="empty"');
    expect(html).toContain('Sem partidas');
    expect(html).toContain('Nada por aqui.');
    expect(html).toContain('Atualizar');
  });

  it('omite descrição/ação quando ausentes', () => {
    const html = renderToStaticMarkup(<EmptyState title="Vazio" />);
    expect(html).toContain('Vazio');
    expect(html).not.toContain('<button');
  });
});

describe('ErrorState', () => {
  const error = {
    error: {
      code: 'MATCH_NOT_FOUND',
      message: 'Partida não encontrada.',
      hint: 'Confira o match ID.',
    },
  };

  it('renderiza code, message e hint do ApiErrorBody com role=alert', () => {
    const html = renderToStaticMarkup(<ErrorState error={error} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('MATCH_NOT_FOUND');
    expect(html).toContain('Partida não encontrada.');
    expect(html).toContain('Confira o match ID.');
  });

  it('omite o hint quando ausente', () => {
    const html = renderToStaticMarkup(
      <ErrorState error={{ error: { code: 'X', message: 'Falhou.' } }} />,
    );
    expect(html).toContain('Falhou.');
    expect(html).not.toContain('Confira');
  });
});
