'use client';

import { useState } from 'react';
import { AiQueryForm } from '@/components/ai';
import { InfoCallout } from '@/components/ui/info-callout';
import { COACH_GREETING, coachReply } from '@/app/console/console-data';

/**
 * Sandbox de IA do perfil (tela Stitch, bloco "Enviar Consulta"): reutiliza
 * o chat simulado do /console (`coachReply`) ROTULADO como demo — nenhuma
 * chamada real ao motor de IA acontece aqui (sem backend no MVP).
 */

export function ProfileAiSandbox() {
  const [response, setResponse] = useState<string>(COACH_GREETING);

  return (
    <div data-profile-ai-sandbox className="flex flex-col gap-3">
      <AiQueryForm
        model="MiniMax-Val-03 (simulado)"
        tokenMeta="SANDBOX DEMO"
        submitLabel="Enviar consulta"
        response={response}
        responseMeta="Resposta simulada"
        onSubmit={(prompt) => setResponse(coachReply(prompt))}
      />
      <InfoCallout label="Sandbox demo">
        Consultas e respostas nesta caixa são simuladas localmente (mesmo motor do{' '}
        <strong>/console</strong>) — nenhum dado do jogador sai do navegador.
      </InfoCallout>
    </div>
  );
}
