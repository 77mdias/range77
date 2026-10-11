'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DemoProfileGrid,
  LiveStatusStrip,
  SearchConsole,
  SearchIngestionModal,
  type DemoProfile,
  type IngestionStep,
  type IngestionStepState,
} from '@/components/home';
import { FeatureModuleCard } from '@/components/home/feature-module-card';
import { PipelineStepCard } from '@/components/ai';
import { Icon } from '@/components/ui/icon';
import { SearchBar, type SearchQuery } from '@/components/ui/search-bar';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section-header';
import { parseRiotId } from '@/lib/validation/riot-id';

/**
 * HomeLanding — landing completa (tela Stitch "Busca de Jogador &
 * Apresentação do Ecossistema"): hero com console de busca, perfis demo,
 * modal de ingestão 3-layer (progresso simulado), arquitetura, módulos e
 * strip de status ao vivo. Ilha client única porque o modal é disparado
 * da busca, dos perfis demo e do CTA do strip — conteúdo 100% estático
 * (sem fetch), renderizado por SSR no primeiro paint.
 */

const DEMO_REGION = 'br' as const;

/** Perfil demo real (HenrikDev): nome verdadeiro — nada de Riot ID fictício. */
const DEMO_RIOT_ID = 'twmz#tower' as const;

const DEMO_PROFILES: readonly DemoProfile[] = [
  { riotId: DEMO_RIOT_ID, regionChip: 'BR', rank: 'Diamond 2', rr: '10 RR', highlighted: true },
];

const STEP_DELAYS_MS = [600, 1400, 2200];

const INITIAL_STEPS: readonly IngestionStepState[] = ['pending', 'pending', 'pending'];

function stepLabels(target: string): readonly string[] {
  return [
    `CAMADA 1: handshake HenrikDev API para ${target}`,
    'CAMADA 2: pipeline compilou os ticks em vetores táticos',
    'CAMADA 3: MiniMax LLM gerando diagnóstico (420 tokens)...',
  ];
}

const PIPELINE_STEPS = [
  {
    phase: 'FASE 01',
    metric: '~420 KB',
    icon: 'download',
    title: 'Ingestão HenrikDev API',
    description:
      'Extração completa de ticks oficiais da Riot Games: eliminações x/y, aberturas de ângulo, timings de defuse e fluxo econômico do saguão.',
    output: 'raw_match_timeline.json',
    highlighted: false,
  },
  {
    phase: 'FASE 02 • NÚCLEO',
    metric: '~85 KB',
    icon: 'refresh',
    title: 'Motor de KPIs',
    description:
      'Detecta matematicamente overpeeking, isolamento em retakes e timing de trade fraco — métricas estritas, zero subjetividade.',
    output: 'kpi_compressed_matrix.bin',
    highlighted: true,
  },
  {
    phase: 'FASE 03',
    metric: '420 tokens',
    icon: 'bot',
    title: 'Síntese cognitiva MiniMax',
    description:
      'O LLM recebe apenas os vetores táticos filtrados e prescreve coaching cirúrgico sem alucinação de jogo.',
    output: 'actionable_coach_diagnosis.md',
    highlighted: false,
  },
] as const;

const FEATURE_MODULES = [
  {
    moduleId: 'MOD_01',
    icon: 'terminal',
    title: 'Histórico telemétrico compacto',
    description:
      'Timeline round a round com classificação econômica (Eco, Semi, Full Buy) e dispersão de mortes nos primeiros 15s de cada round.',
    statLabel: 'Detecção de duelos',
    statValue: '100% exato',
  },
  {
    moduleId: 'MOD_02',
    icon: 'target',
    title: 'Benchmark por elo real',
    description:
      'Compare First Blood, KAST% e dano médio por round com o topo 1% do seu próprio ranque.',
    statLabel: 'Base comparativa',
    statValue: 'RAD / IMM / ASC',
  },
  {
    moduleId: 'MOD_03',
    icon: 'shield',
    title: 'Map pool deficit engine',
    description:
      'Identifique quais mapas estão drenando seu RR e receba rotinas de correção de retake e execução de site.',
    statLabel: 'Diagnóstico map pool',
    statValue: '7 mapas ativos',
  },
  {
    moduleId: 'MOD_04',
    icon: 'bot',
    title: 'Sandbox de IA interativo',
    description:
      'Converse com o modelo sobre decisões específicas: "Por que perdi o clutch 1v2 no round 18?"',
    statLabel: 'Motor de conversa',
    statValue: 'MiniMax 2.5',
  },
] as const;

export function HomeLanding() {
  const router = useRouter();
  const timers = useRef<number[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [target, setTarget] = useState<string>(DEMO_RIOT_ID);
  const [route, setRoute] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<readonly IngestionStepState[]>(INITIAL_STEPS);

  const doneCount = stepStates.filter((state) => state === 'done').length;
  const progress = (doneCount / INITIAL_STEPS.length) * 100;
  const ready = doneCount === INITIAL_STEPS.length;

  function clearTimers(): void {
    for (const id of timers.current) {
      window.clearTimeout(id);
    }
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function startIngestion(riotId: string, region: string): void {
    clearTimers();
    setTarget(riotId);
    setModalOpen(true);
    setStepStates(['running', 'pending', 'pending']);

    const parsed = parseRiotId(riotId);
    setRoute(
      parsed.ok
        ? `/players/${region}/${encodeURIComponent(parsed.value.name)}/${encodeURIComponent(
            parsed.value.tag,
          )}`
        : null,
    );

    STEP_DELAYS_MS.forEach((delay, index) => {
      const id = window.setTimeout(() => {
        setStepStates((current) =>
          current.map((state, stepIndex) => {
            if (stepIndex <= index) {
              return 'done';
            }
            if (stepIndex === index + 1) {
              return 'running';
            }
            return state;
          }),
        );
      }, delay);
      timers.current.push(id);
    });
  }

  function handleClose(): void {
    clearTimers();
    setModalOpen(false);
  }

  function handleOpenReport(): void {
    setModalOpen(false);
    if (route !== null) {
      router.push(route);
    }
  }

  function handleSearchSubmit(query: SearchQuery): void {
    startIngestion(`${query.name}#${query.tag}`, query.region);
  }

  const steps: readonly IngestionStep[] = stepLabels(target).map((label, index) => ({
    label,
    state: stepStates[index] ?? 'pending',
  }));

  return (
    <div data-component="home-landing">
      {/* ── Hero de busca ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(var(--color-line)_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-12 text-center md:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-raised px-2 py-1 font-hud text-label uppercase text-text-secondary">
            <Icon name="target" />
            Valorant competitive engine &amp; cognitive coach
          </span>

          <h1 className="mt-4 max-w-4xl font-display text-display-md uppercase leading-tight tracking-tight text-text-primary sm:text-display-lg md:text-display-xl">
            Análise telemétrica profissional e coaching de IA para Valorant
          </h1>

          <p className="mt-3 max-w-2xl text-body-lg text-text-secondary">
            Conecte sua conta Riot ID. O backend calcula micro-decisões de round, economia e
            posicionamento, entregando diagnósticos objetivos — sem desperdício de tokens.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <SearchConsole
              hardShadow
              statusChip="STATUS: AGUARDANDO INPUT"
              helperText="Pipeline 3-layer pronto — pressione Enter ou escolha um perfil demo"
            >
              <SearchBar onSubmit={handleSearchSubmit} />
            </SearchConsole>

            <DemoProfileGrid
              profiles={DEMO_PROFILES}
              onSelect={(profile) => startIngestion(profile.riotId, DEMO_REGION)}
            />
          </div>
        </div>
      </section>

      {/* ── Arquitetura de 3 camadas ────────────────────────────────── */}
      <section aria-label="Arquitetura de 3 camadas" className="border-b border-line bg-surface-raised px-4 py-12">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeader
            title="Arquitetura de 3 camadas: redução de tokens e zero alucinação"
            annotation="MOTOR DE CONVERSÃO MATEMÁTICA"
            marker="accent"
            meta={<span>{'98.5% economia de tokens • <150ms de latência'}</span>}
          />
          <div className="mt-4 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {PIPELINE_STEPS.map((step, index) => (
              <div key={step.phase} className="contents">
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="hidden items-center justify-center text-text-secondary md:flex"
                  >
                    <Icon name="arrow-right" size="md" />
                  </span>
                ) : null}
                <PipelineStepCard
                  phase={step.phase}
                  highlighted={step.highlighted}
                  metric={step.metric}
                  icon={step.icon}
                  title={step.title}
                  description={step.description}
                  output={step.output}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Módulos do ecossistema ──────────────────────────────────── */}
      <section aria-label="Módulos do ecossistema" className="px-4 py-12">
        <div className="mx-auto w-full max-w-7xl">
          <SectionHeader
            title="Recursos táticos calibrados para alta performance"
            annotation="MÓDULOS INTEGRADOS"
            meta={<span>MOD: 04 suítes ativas</span>}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_MODULES.map((module) => (
              <FeatureModuleCard
                key={module.moduleId}
                moduleId={module.moduleId}
                icon={module.icon}
                title={module.title}
                description={module.description}
                statLabel={module.statLabel}
                statValue={module.statValue}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Status ao vivo + CTA ────────────────────────────────────── */}
      <LiveStatusStrip
        items={[
          { label: 'Latência API', value: '12 ms', live: true },
          { label: 'Computação 3-layer', value: 'Online' },
          { label: 'Jogadores indexados', value: '42.890+' },
          { label: 'Patch Riot Games', value: 'v9.11 compat' },
        ]}
        actions={
          <Button size="sm" onClick={() => startIngestion(DEMO_RIOT_ID, DEMO_REGION)}>
            Testar perfil demo ({DEMO_RIOT_ID})
          </Button>
        }
      />

      <SearchIngestionModal
        open={modalOpen}
        target={target}
        steps={steps}
        progressPercent={progress}
        ready={ready}
        onOpenReport={handleOpenReport}
        onClose={handleClose}
      />
    </div>
  );
}
