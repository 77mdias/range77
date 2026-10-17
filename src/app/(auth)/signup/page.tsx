import { AuthTabs } from '@/components/auth/auth-tabs';
import { AuthTerminal } from '@/components/auth/auth-terminal';
import { AuthDivider } from '@/components/auth/auth-divider';
import { InfoRow } from '@/components/auth/info-row';
import { resolveCallbackPath } from '@/components/auth/resolve-callback-path';
import { RiotCallout } from '@/components/auth/riot-callout';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { TelemetryPanel } from '@/components/auth/telemetry-panel';
import { TelemetryStrip } from '@/components/auth/telemetry-strip';
import { Sparkline } from '@/components/ui/sparkline';
import { SignupForm } from './signup-form';

/**
 * PÁGINA: /signup (Stitch tela 8 — "Cadastro & Novo Operador").
 *
 * Diferente da tela 7: card de registro (col-span-8) + sidebar de inteligência
 * (col-span-4), alinhados ao TOPO (sem `justify-center`), e sem a coluna de
 * telemetria pesada à esquerda.
 *
 * `instant = false`: consome `searchParams`.
 */

export const instant = false;

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

/** Série do gráfico de latência do Stitch, espelhada em ms. */
const LATENCY_SERIES = [16.1, 14.2, 15, 11.4, 12.6, 9.2, 10.8, 10.1, 5.4, 8.1, 4.2] as const;

const ACTIVATION_STEPS = [
  {
    icon: 'history',
    title: 'ANÁLISE DE ATÉ 20 PARTIDAS RECENTES',
    body: 'Recuperação de dados brutos de rounds, first bloods e economia por rodada.',
  },
  {
    icon: 'bot',
    title: 'SÍNTESE COGNITIVA MINIMAX (-98.5% TOKENS)',
    body: 'Sumarização ultracompacta em linguagem natural para leitura em 30 segundos.',
  },
  {
    icon: 'target',
    title: 'DETECÇÃO DE OVERPEEKING & RETAKE',
    body: 'Algoritmo de trigonometria espacial identificando duelos em desvantagem numérica.',
  },
  {
    icon: 'check',
    title: 'SUPORTE NATIVO AO PATCH RIOT v9.11',
    body: 'Pesos calibrados para balanceamento de duelistas, flashes e tempo de defuse.',
  },
] as const;

export default async function SignupPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackPath = resolveCallbackPath(query.next);

  return (
    <div
      data-signup-page
      className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3"
    >
      <TelemetryStrip
        variant="bar"
        items={['SYS_ENV: PROD_GLOBAL // PROTOCOL_V4.2.1', 'LATENCY: 12ms (SA-EAST)', 'ZERO SCRIM LEAK CERTIFIED']}
        trailing={
          <span className="border border-line bg-accent px-1 py-0.5 font-hud text-label-xs uppercase text-on-accent">
            CADASTRO ABERTO
          </span>
        }
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-8">
          <AuthTerminal
            protocolLine="// PROTOCOLO DE REGISTRO // NOVO OPERADOR TELEMÉTRICO"
            metaBadge="HASH ID: REC_9942_NEW"
          >
            <AuthTabs />

            <div>
              <h1 className="font-display text-display-xl-mobile uppercase tracking-tighter text-text-primary sm:text-display-xl">
                INICIALIZAR CONTA VALORANT.COACH
              </h1>
              <p className="mt-1 text-body-md text-text-secondary">
                Crie seu perfil telemétrico para calcular micro-decisões, benchmark de elo e
                coaching de IA.
              </p>
            </div>

            <SsoButtons
              callbackPath={callbackPath}
              labels={{ google: 'Cadastrar com Google', discord: 'Cadastrar com Discord' }}
            />

            <RiotCallout variant="status" title="STATUS HOMOLOGAÇÃO RIOT GAMES OAUTH DIRECT">
              Riot Sign-On (OAuth direto) em processo de homologação de produção com a Riot Games.
              Você pode vincular seu Riot ID (ex:{' '}
              <span className="font-hud text-text-primary">TenZ#0001</span>) imediatamente após a
              criação da conta.
            </RiotCallout>

            <AuthDivider label="OU PREENCHA O FORMULÁRIO DE REGISTRO" />

            <SignupForm callbackPath={callbackPath} />
          </AuthTerminal>
        </div>

        <div className="flex flex-col gap-3 lg:col-span-4">
          <TelemetryPanel eyebrow="PROTOCOLO DE ATIVAÇÃO" badge="TIER // FREE VOD">
            <p className="mb-2">
              Ao finalizar seu cadastro, o motor analítico aplica automaticamente o seguinte
              roteiro de auditoria tática:
            </p>
            <div className="flex flex-col gap-2.5">
              {ACTIVATION_STEPS.map((step) => (
                <InfoRow key={step.title} icon={step.icon} title={step.title}>
                  {step.body}
                </InfoRow>
              ))}
            </div>
          </TelemetryPanel>

          <TelemetryPanel
            eyebrow="TELEMETRIA DE LATÊNCIA DA API"
            badge="99.98% UP"
            footer={
              <span className="flex items-center justify-between gap-2">
                <span>MIN: 4.2ms</span>
                <span>MÉDIA: 9.8ms</span>
                <span>MAX: 16.1ms</span>
              </span>
            }
          >
            <Sparkline
              points={LATENCY_SERIES}
              width={200}
              height={48}
              ariaLabel="Telemetria de latência da API"
              className="mb-2 w-full"
            />
            <div className="flex items-center justify-between gap-2 font-hud text-label-xs uppercase text-text-primary">
              <span>INGESTION PIPELINE</span>
              <span>120 FPS PARSER</span>
            </div>
          </TelemetryPanel>

          <TelemetryPanel eyebrow="ACESSO" title="JÁ POSSUI UMA CONTA TELEMÉTRICA?">
            Acesse imediatamente com suas credenciais para verificar os treinos e o histórico de
            VODs.{' '}
            <a href="/login" className="font-hud text-label-xs uppercase text-text-primary underline-offset-4 hover:underline">
              ACESSAR O LOGIN
            </a>
          </TelemetryPanel>

          <TelemetryPanel eyebrow="SEGURANÇA" title="CRIPTOGRAFIA DE ARQUIVOS VOD">
            Logs de partidas e dados analíticos blindados sob chave única de operador.
          </TelemetryPanel>
        </div>
      </div>
    </div>
  );
}
