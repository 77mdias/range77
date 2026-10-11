'use client';

import { Fragment, useState } from 'react';
import {
  ChatInputBar,
  ChatMessage,
  CodeViewer,
  LayerTabs,
  PipelineFlow,
} from '@/components/ai';
import { InfoCallout } from '@/components/ui/info-callout';
import { KpiTile } from '@/components/ui/kpi-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { TagLabel } from '@/components/ui/tag-label';
import {
  COACH_GREETING,
  COACH_PROMPTS,
  CONSOLE_LAYERS,
  PAYLOAD_PROPERTY_NOTE,
  PIPELINE_STAGES,
  SEED_EXCHANGE,
  coachReply,
  type CoachExchange,
} from './console-data';

/**
 * ConsoleView — ilha client da tela "/console" (Stitch "Console API & IA
 * Coaching Assistant"): header SYS.CONSOLE, strip de KPIs (token ratio +
 * latência), pipeline 3-layer, inspetor de payload (layer tabs + code
 * viewer + nota arquitetural) e o AI Coach Chat Sandbox.
 *
 * Client Component por causa do estado (camada ativa + log do chat). O
 * sandbox responde localmente e está rotulado como simulado — nenhum dado
 * de jogador é buscado aqui.
 */

const DEFAULT_LAYER_ID = 'l1';

export function ConsoleView() {
  const [activeLayerId, setActiveLayerId] = useState(DEFAULT_LAYER_ID);
  const [exchanges, setExchanges] = useState<readonly CoachExchange[]>([SEED_EXCHANGE]);

  const activeLayer = CONSOLE_LAYERS.find((layer) => layer.id === activeLayerId);

  function handleSend(prompt: string): void {
    setExchanges((list) => [...list, { prompt, reply: coachReply(prompt) }]);
  }

  return (
    <div data-component="console-view" className="mx-auto w-full max-w-7xl px-4 py-10">
      {/* ── Header SYS.CONSOLE ──────────────────────────────────────── */}
      <header className="border-b border-line pb-5">
        <p className="font-hud text-label uppercase tracking-wider text-text-secondary">
          SYS.CONSOLE // ARCHITECTURE_V4 • LIVE CONTEXT COMPRESSION
        </p>
        <h1 className="mt-2 font-display text-display-lg uppercase leading-tight tracking-tight text-text-primary sm:text-display-xl">
          Console da pipeline de dados &amp; coaching assistant
        </h1>
      </header>

      {/* ── Strip de KPIs ───────────────────────────────────────────── */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <KpiTile label="Token Optimization Ratio" value="98.5%" trailing="Economizado" />
        <KpiTile label="Latency / Roundtrip" value="142ms" trailing="MiniMax-Val-03" />
      </div>

      {/* ── Pipeline 3-layer ────────────────────────────────────────── */}
      <section className="mt-8" aria-label="Pipeline 3-layer">
        <PipelineFlow stages={PIPELINE_STAGES} />
      </section>

      {/* ── Inspetor de payload ─────────────────────────────────────── */}
      <section className="mt-8" aria-label="Inspecionar payload">
        <SectionHeader
          title="Inspecionar payload"
          annotation="SCHEMA: PROTOCOL_V4.JSON"
          meta={activeLayer !== undefined ? <span>{activeLayer.badge}</span> : undefined}
        />
        <div
          data-console-inspector
          className="flex flex-col gap-3 rounded-md border border-line bg-surface p-3"
        >
          <LayerTabs
            ariaLabel="Camada do payload"
            options={CONSOLE_LAYERS.map((layer) => ({ id: layer.id, label: layer.label }))}
            activeId={activeLayerId}
            onChange={setActiveLayerId}
          />

          {activeLayer !== undefined ? (
            <CodeViewer
              filename={activeLayer.filename}
              code={activeLayer.payload}
              badge="UTF-8 • JSON válido"
              actions={[
                { label: 'Copiar Payload', icon: 'copy', onSelect: () => {} },
                // Ações ilustrativas da tela Stitch (sem backend de export/simulação).
                { label: 'Exportar Schemas', icon: 'download', onSelect: () => {} },
                {
                  label: 'Simular Nova Partida',
                  icon: 'refresh',
                  variant: 'primary',
                  onSelect: () => {},
                },
              ]}
            />
          ) : null}

          <InfoCallout label={PAYLOAD_PROPERTY_NOTE.label}>
            {PAYLOAD_PROPERTY_NOTE.body}
          </InfoCallout>
        </div>
      </section>

      {/* ── AI Coach Chat Sandbox ───────────────────────────────────── */}
      <section className="mt-8" aria-label="AI Coach Chat Sandbox">
        <SectionHeader
          title="AI Coach Chat Sandbox"
          annotation="MINIMAX-VAL-03"
          marker="accent"
          meta={<span>Respostas simuladas (demo)</span>}
        />
        <div className="grid gap-3 lg:grid-cols-[1fr_18rem]">
          <div className="flex flex-col rounded-md border border-line bg-surface-raised p-3">
            <div className="flex flex-col gap-2" data-console-chat>
              <ChatMessage variant="system">
                Sessão sandbox iniciada • contexto da camada 3 carregado
              </ChatMessage>
              <ChatMessage
                variant="ai"
                sender="ValCoach AI // MiniMax-Val-03"
                timestamp="demo"
                meta={[
                  { label: 'Contexto: Layer 3' },
                  { label: 'Simulado', tone: 'accent' },
                ]}
              >
                {COACH_GREETING}
              </ChatMessage>

              {exchanges.map((exchange, index) => (
                <Fragment key={`${exchange.prompt}-${index}`}>
                  <ChatMessage variant="user" sender="Você">
                    {exchange.prompt}
                  </ChatMessage>
                  <ChatMessage
                    variant="ai"
                    sender="ValCoach AI // MiniMax-Val-03"
                    meta={[{ label: 'Simulado', tone: 'accent' }]}
                    embedded={
                      exchange.replyEmbedded !== undefined ? (
                        <>
                          <p className="font-hud text-label font-bold uppercase text-text-secondary">
                            // Drill recomendado:
                          </p>
                          <p className="mt-1 text-body">{exchange.replyEmbedded}</p>
                        </>
                      ) : undefined
                    }
                  >
                    {exchange.reply}
                  </ChatMessage>
                </Fragment>
              ))}
            </div>

            <ChatInputBar
              onSend={handleSend}
              placeholder="Pergunte ao coach sobre a sua partida..."
            />
          </div>

          <aside className="flex flex-col gap-3">
            <div data-console-prompts className="rounded-md border border-line bg-surface p-3">
              <TagLabel>Sugestões</TagLabel>
              <div className="mt-2 flex flex-col gap-2">
                {COACH_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-md border border-line bg-surface-raised px-2.5 py-2 text-left font-hud text-label uppercase text-text-primary transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
