import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatMessage } from '@/components/ai';

describe('ChatMessage', () => {
  it('mensagem de IA: avatar tinta, remetente e meta chips', () => {
    const html = renderToStaticMarkup(
      <ChatMessage
        variant="ai"
        sender="Valorant AI Coach // MiniMax"
        timestamp="14:02"
        meta={[
          { label: 'Contexto: Layer 3' },
          { label: 'Confiança: 99.4%', tone: 'accent' },
        ]}
      >
        Seu ADS em long range está 12% abaixo do elo.
      </ChatMessage>,
    );
    expect(html).toContain('data-variant="ai"');
    expect(html).toContain('Valorant AI Coach // MiniMax');
    expect(html).toContain('Confiança: 99.4%');
    expect(html).toContain('bg-accent');
  });

  it('mensagem de usuário alinhada à direita com avatar acento', () => {
    const html = renderToStaticMarkup(
      <ChatMessage variant="user" sender="U">
        Como melhorar meu entry?
      </ChatMessage>,
    );
    expect(html).toContain('data-variant="user"');
    expect(html).toContain('self-end');
    expect(html).toContain('Como melhorar meu entry?');
  });

  it('mensagem de sistema é uma pill centralizada', () => {
    const html = renderToStaticMarkup(
      <ChatMessage variant="system">Sessão iniciada — contexto carregado</ChatMessage>,
    );
    expect(html).toContain('data-variant="system"');
    expect(html).toContain('Sessão iniciada — contexto carregado');
  });

  it('renderiza bloco embutido (drill recomendado)', () => {
    const html = renderToStaticMarkup(
      <ChatMessage variant="ai" sender="AI" embedded={<p>Drill: 20 retakes no Range</p>}>
        Corpo
      </ChatMessage>,
    );
    expect(html).toContain('Drill: 20 retakes no Range');
  });
});
