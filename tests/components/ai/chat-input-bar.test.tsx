import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChatInputBar } from '@/components/ai';

describe('ChatInputBar', () => {
  it('renderiza input e botão de envio', () => {
    const html = renderToStaticMarkup(<ChatInputBar onSend={() => {}} />);
    expect(html).toContain('data-component="chat-input-bar"');
    expect(html).toContain('Enviar');
    expect(html).toContain('placeholder');
  });

  it('botão disabled quando vazio ou desabilitado', () => {
    const html = renderToStaticMarkup(<ChatInputBar onSend={() => {}} />);
    expect(html).toContain('disabled');
    const disabled = renderToStaticMarkup(<ChatInputBar onSend={() => {}} disabled />);
    expect(disabled).toContain('disabled:opacity-50');
  });
});
