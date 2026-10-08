/**
 * PASSO 3 — IMPLEMENTAÇÃO: módulo de ambientes do ValCoach AI.
 *
 * Ambientes do projeto:
 *   - `test`: Vitest, 100% mockado, sem credenciais reais;
 *   - `dev` : container Docker local, variáveis injetadas pelo Infisical
 *             que roda na máquina hospedeira (`infisical run --env=dev`);
 *   - `prod`: Vercel, variáveis configuradas manualmente no painel.
 *
 * Fonte de dados: SEMPRE `process.env` (nunca arquivos .env), garantindo
 * compatibilidade nativa com o runtime da Vercel.
 */

/** Ambientes válidos da aplicação (ordem canônica usada em mensagens). */
export const APP_ENVIRONMENTS = ['dev', 'test', 'prod'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const NODE_ENV_TO_APP_ENV: Readonly<Record<string, AppEnvironment | undefined>> = {
  development: 'dev',
  test: 'test',
  production: 'prod',
};

const APP_ENV_TO_NODE_ENV: Readonly<Record<AppEnvironment, string>> = {
  dev: 'development',
  test: 'test',
  prod: 'production',
};

/** Erro de configuração de ambiente — sempre com remediação explícita. */
export class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentValidationError';
  }
}

function isAppEnvironment(value: unknown): value is AppEnvironment {
  return typeof value === 'string' && (APP_ENVIRONMENTS as readonly unknown[]).includes(value);
}

export interface ParseAppEnvironmentInput {
  readonly appEnv?: string | undefined;
  readonly nodeEnv?: string | undefined;
}

/**
 * Resolve o ambiente da aplicação.
 *
 * Precedência: `APP_ENV` explícito > mapeamento de `NODE_ENV` > erro.
 * Falha rápido (fail fast) com mensagem listando os valores aceitos —
 * ambientes desconhecidos nunca são silenciosamente tratados como dev.
 */
export function parseAppEnvironment(input: ParseAppEnvironmentInput = {}): AppEnvironment {
  const { appEnv, nodeEnv } = input;

  if (appEnv !== undefined) {
    if (isAppEnvironment(appEnv)) {
      return appEnv;
    }
    throw new EnvironmentValidationError(
      `APP_ENV inválido: "${appEnv}". Valores aceitos: ${APP_ENVIRONMENTS.join(', ')}.`,
    );
  }

  const mapped = nodeEnv !== undefined ? NODE_ENV_TO_APP_ENV[nodeEnv] : undefined;
  if (mapped !== undefined) {
    return mapped;
  }

  throw new EnvironmentValidationError(
    nodeEnv === undefined
      ? 'Não foi possível determinar o ambiente do app: defina APP_ENV (dev | test | prod) ou NODE_ENV.'
      : `Não foi possível mapear NODE_ENV="${nodeEnv}" para um ambiente conhecido. Defina APP_ENV explicitamente (dev | test | prod).`,
  );
}

/** Fonte de leitura de variáveis (injetada nos testes; padrão: process.env). */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Snapshot tipado e normalizado do ambiente da aplicação. */
export interface AppEnv {
  readonly APP_ENV: AppEnvironment;
  readonly NODE_ENV: string;
  readonly DATABASE_URL?: string | undefined;
  readonly HENRIKDEV_API_KEY?: string | undefined;
  readonly MINIMAX_API_KEY?: string | undefined;
}

/** Trim + vazio conta como ausente (evita "credencial fantasma" em branco). */
function pickDefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Carrega e valida o ambiente a partir de `source` (padrão: `process.env`).
 * Credenciais ficam OPCIONAIS aqui: rotas/persistências que as exigirem
 * devem chamar `requireEnv` no ponto de uso — fail fast contextualizado.
 */
export function loadAppEnv(source: EnvSource = process.env): AppEnv {
  const APP_ENV = parseAppEnvironment({ appEnv: source['APP_ENV'], nodeEnv: source['NODE_ENV'] });

  return {
    APP_ENV,
    NODE_ENV: pickDefined(source['NODE_ENV']) ?? APP_ENV_TO_NODE_ENV[APP_ENV],
    DATABASE_URL: pickDefined(source['DATABASE_URL']),
    HENRIKDEV_API_KEY: pickDefined(source['HENRIKDEV_API_KEY']),
    MINIMAX_API_KEY: pickDefined(source['MINIMAX_API_KEY']),
  };
}

/** Variáveis sensíveis que só podem ser obtidas via `requireEnv`. */
export type RequiredEnvVar = 'DATABASE_URL' | 'HENRIKDEV_API_KEY' | 'MINIMAX_API_KEY';

/** Remediação por ambiente — a mensagem diz EXATAMENTE como corrigir. */
const REMEDIATION_HINT: Readonly<Record<AppEnvironment, string>> = {
  dev: 'No desenvolvimento local as variáveis são injetadas pela CLI do Infisical na máquina hospedeira: infisical run --env=dev -- docker compose up.',
  test: 'O ambiente de teste não deve depender de credenciais reais — use mocks dos serviços externos.',
  prod: 'Configure a variável manualmente no painel da Vercel (Settings → Environment Variables).',
};

/**
 * Exige uma variável sensível no ponto de uso, com erro explicativo
 * citando a variável, o ambiente atual e o caminho de remediação.
 */
export function requireEnv(env: AppEnv, key: RequiredEnvVar): string {
  const value = env[key];
  if (value === undefined) {
    throw new EnvironmentValidationError(
      `Variável de ambiente obrigatória ausente ou vazia: "${key}" (ambiente "${env.APP_ENV}"). ${REMEDIATION_HINT[env.APP_ENV]}`,
    );
  }
  return value;
}
