import { AuthDivider } from '@/components/auth/auth-divider';
import { AuthTabs } from '@/components/auth/auth-tabs';
import { AuthTerminal } from '@/components/auth/auth-terminal';
import { InfoRow } from '@/components/auth/info-row';
import { resolveCallbackPath } from '@/components/auth/resolve-callback-path';
import { RiotCallout } from '@/components/auth/riot-callout';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { StatStrip } from '@/components/auth/stat-strip';
import { TelemetryPanel } from '@/components/auth/telemetry-panel';
import { TelemetryStrip } from '@/components/auth/telemetry-strip';
import { LoginForm } from './login-form';

/**
 * PÁGINA: /login (Stitch tela 7 — "Autenticação & Login").
 *
 * Grid de 12 colunas: telemetria à esquerda (col-span-5, abaixo no mobile) e o
 * terminal de acesso à direita (col-span-7, acima no mobile). O proxy (Next 16)
 * redireciona rotas protegidas para cá com `?next=<destino>`.
 *
 * `instant = false`: a página consome `searchParams` (doc de `instant`).
 */

export const instant = false;

interface PageProps {
  searchParams: Promise<{ next?: string | string[] }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const callbackPath = resolveCallbackPath(query.next);

  return (
    <div
      data-login-page
      className="flex w-full flex-1 flex-col justify-center gap-3 px-4 py-3"
    >
      <TelemetryStrip
        items={[
          'GATEWAY: SA-BRAZIL-EAST-1 // SECURE ROUTE',
          'AUTH ENGINE: HYDRA-V4.2',
          'ACTIVE THREADS: 14.802',
          'TLS 1.3 VERIFIED',
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        {/* Coluna de telemetria — order-2 no mobile, à esquerda no desktop. */}
        <div className="order-2 flex flex-col gap-3 lg:order-1 lg:col-span-5">
          <TelemetryPanel
            accent
            eyebrow="PROTOCOL ADVICE: ACCESS LEVEL-0"
            badge="SYS_ID: 8092-B"
            title="Inteligência Algorítmica Pós-Login"
          >
            Ao ingressar no terminal, seus logs de combate de Ascent, Haven e Lotus são ingeridos
            em tempo real. Identifique timing de crosshair placement, retakes e desperdício de
            utilitários em fração de segundos.
          </TelemetryPanel>

          <StatStrip
            items={[
              { label: 'RTT LATENCY', value: '<14ms' },
              { label: 'PRO MATCHES', value: '1.2M+' },
              { label: 'AI CONFIDENCE', value: '99.4%' },
            ]}
          />

          <TelemetryPanel
            eyebrow="PIPELINE SEGURO 3-LAYER"
            badge="TELEMETRY ON"
            footer={
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>REDE ATIVA: 42.890+ AGENTES CONECTADOS</span>
                <span className="border border-line bg-surface px-1 py-0.5 text-text-primary">
                  100% OPERACIONAL
                </span>
              </span>
            }
          >
            <div className="flex flex-col gap-2.5">
              <InfoRow icon="shield" title="Criptografia Local de Tokens">
                Armazenamento zero-knowledge. Suas credenciais de jogo nunca são expostas em texto
                puro.
              </InfoRow>
              <InfoRow icon="refresh" title="Riot API Live Sync">
                Sincronização imediata de MMR, split de danos de headshot e KAST por rodada.
              </InfoRow>
              <InfoRow icon="target" title="Diagnósticos Instantâneos <150ms">
                Processamento neural ultrarrápido com análise de micro-decisões round a round.
              </InfoRow>
            </div>
          </TelemetryPanel>

          <TelemetryPanel eyebrow="ÚLTIMO SNAPSHOT ANALISADO" badge="SOVA">
            <p className="font-hud text-label-md uppercase text-text-primary">
              MAP: SUNSET // 13-9 VICTORY
            </p>
            <div className="mt-1 flex items-center gap-3 font-hud text-label-sm uppercase">
              <span className="text-text-primary">24 / 11 / 8</span>
              <span className="text-text-secondary">HS%: 38.2%</span>
              <span className="text-text-secondary">ACS: 289</span>
            </div>
          </TelemetryPanel>
        </div>

        {/* Terminal de acesso. */}
        <div className="order-1 flex flex-col gap-3 lg:order-2 lg:col-span-7">
          <AuthTerminal
            protocolLine="// PROTOCOLO DE ACESSO // VALORANT.COACH TELEMETRY PIPELINE"
            metaBadge="PORT: 443"
          >
            <AuthTabs />

            <div>
              <h1 className="font-display text-display-xl-mobile uppercase tracking-tighter text-text-primary sm:text-display-xl">
                ACESSO AO HUB TELEMÉTRICO
              </h1>
              <p className="mt-1 text-body-md text-text-secondary">
                Conecte suas credenciais para sincronizar partidas, rotinas de coaching e
                diagnósticos de IA.
              </p>
            </div>

            <SsoButtons callbackPath={callbackPath} discordBadge="COMMUNITY" />

            <RiotCallout
              variant="rso"
              title="Riot Games Sign-On (RSO) - Oficial"
              badge="[AGUARDANDO KEY PROD RIOT V9]"
            >
              Integração direta com Riot ID (OAuth2) em homologação. Utilize login com e-mail,
              Google ou Discord e vincule seu Riot ID (ex:{' '}
              <code className="font-hud text-text-primary">Agente#BR1</code>) no painel após
              entrar.
            </RiotCallout>

            <AuthDivider label="OU ACESSE COM E-MAIL E SENHA" />

            <LoginForm callbackPath={callbackPath} />

            <p className="text-body-sm text-text-secondary">
              Ainda não possui credenciais telemétricas? Crie sua conta gratuitamente em segundos.{' '}
              <a
                href="/signup"
                className="font-hud text-label-xs uppercase text-text-primary underline-offset-4 hover:underline"
              >
                REGISTRAR AGENTE
              </a>
            </p>
          </AuthTerminal>
        </div>
      </div>

      <TelemetryStrip
        variant="bar"
        items={[
          'NODE: SA-BR-01',
          'RIOT API RATELIMIT: 99.8% HEALTHY',
          'VANGUARD COMPATIBLE LOG PARSER',
        ]}
        trailing={<span>SESSION HASH: 0x9AF8...B12</span>}
      />
    </div>
  );
}
