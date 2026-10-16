# Segurança & CI/CD

Pipeline de segurança com **gate estrito**: achados bloqueiam o merge — não
são apenas reportados. Este documento define as normas seguidas, o que cada
job faz, as exceções permitidas e os passos manuais no GitHub.

> Workflows: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
> (qualidade) e
> [`.github/workflows/security.yml`](../../.github/workflows/security.yml)
> (segurança). Automação de upgrades:
> [`.github/dependabot.yml`](../../.github/dependabot.yml).

## Normas de referência

| Norma | O que pega aqui |
|---|---|
| **NIST SSDF** (SP 800-218) | PW.7/PW.8 (revisão e teste de segurança no CI), PS.1 (nenhum segredo no repositório/imagem) |
| **OWASP Top 10 2021** | A06 (componentes vulneráveis → audit/dependency-review/Dependabot), A07 (auth — Better Auth → CodeQL `security-extended`) |
| **CIS Software Supply Chain Security Guide** | actions pinadas por SHA, `permissions:` mínimos por job, `persist-credentials: false`, `concurrency` |
| **OpenSSF Scorecard** | medição semanal da postura do repositório (publica score + SARIF) |

## Jobs e política de bloqueio

| Job (`security.yml`) | Ferramenta | Gatilho | Bloqueia quando… |
|---|---|---|---|
| `segredos` | gitleaks v3 | PR, push `main`, semanal | QUALQUER segredo (PR: commits do PR; semanal: histórico completo) |
| `dependencias` | `npm audit` | PR, push `main`, semanal | CVE **high/critical** no lockfile resolvido |
| `review-deps-pr` | dependency-review | só PR | PR **introduz** CVE high/critical (compara `base…head`) |
| `sast-codeql` | CodeQL (`security-extended`) | PR, push `main` | novos alertas — via branch protection (abaixo) |
| `container-iac` | Trivy `config` (v0.70.0) | PR, push `main`, semanal | misconfig **HIGH/CRITICAL** em `Dockerfile`/`docker-compose.yml` |
| `scorecard` | OpenSSF Scorecard | push `main`, semanal | nunca (informativo) |

O CI de qualidade ([`ci.yml`](../../.github/workflows/ci.yml)) é gate
obrigatório à parte: typecheck + testes com cobertura (analytics 100%) + build
de produção com Cache Components.

## Validação local (antes de abrir PR)

Os mesmos scanners usados no CI, rodando local:

```bash
npm audit --audit-level=high                                   # gate de dependências
trivy config --severity HIGH,CRITICAL --exit-code 1 .          # gate de container/IaC
gitleaks detect --source . --log-opts='--all' --no-banner      # segredos (histórico completo)
```

Estado na criação da pipeline (2026-10): **0 leaks em 73 commits**, 0
misconfig HIGH/CRITICAL, 0 vulnerabilidades npm.

## Passos manuais no GitHub (obrigatórios, uma vez)

O pipeline só é completo com estas chaves ligadas — todas gratuitas em
repositório **público** (Settings → Code security and analysis):

1. **Secret scanning + Push protection** — bloqueia o push de segredos
   conhecidos ANTES de entrarem no histórico (gitleaks é a segunda linha).
2. **Dependabot alerts** — alimenta o painel; os PRs de upgrade vêm do
   `dependabot.yml` (semanal, minor+patch agrupados).
3. **Branch protection em `main`** (Settings → Branches):
   - Require pull request + status checks obrigatórios:
     `verify` (CI), `segredos`, `dependencias`, `review-deps-pr`,
     `container-iac` (Segurança);
   - **Require code scanning results → CodeQL** — é ISTO que torna o SAST
     bloqueante (o CodeQL em si publica na aba Security; a regra de branch
     trava o merge com alertas novos).
4. **Code scanning**: usar o *advanced setup* (nossa workflow). NÃO ligar o
   *default setup* — conflita com a workflow `security.yml`.

## Exceções e falsos positivos

Exceção é um decisão registrada, nunca um `git commit -f`:

- **gitleaks** → `gitleaks.toml` na raiz com bloco `[allowlist]` comentando
  o PORQUÊ (o arquivo é detectado automaticamente pela action).
- **Trivy** → `.trivyignore` com `AVD-DS-XXXX` + justificativa (aceito pelo
  input `trivyignores` da action).
- **npm audit** → preferir upgrade real; em último caso,
  [override](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
  no `package.json` com comentário no commit.

## Decisões já tomadas (contexto)

- **`agents` 0.24.0 → 0.28.1** — corrige 3 CVEs high (GHSA-6qxp-vccf-f47h,
  OAuth do MCP SDK). O pacote ainda não é importado em nenhum código: se não
  entrar na fase do chatbot, REMOVÊ-lo é a postura de menor superfície.
- **Override escopado do esbuild** (`@esbuild-kit/core-utils → ^0.25.12`) —
  corrige 4 moderates (GHSA-67mh-4wv8-2f99, dev server do esbuild) sem
  descer o drizzle-kit nem quebrar vitest/tsx (que usam esbuild ≥0.27 na raiz).
  É fix de lockfile, não mudança de API — drizzle-kit e a suite (908 testes)
  validados após a troca.
- **Actions por SHA + Dependabot `github-actions`** — o pin por SHA evita o
  golpe de tag movida; o Dependabot mantém os pinos atualizados (PR semanal).

## Próximos passos (quando existirem)

- **Imagem de produção** (hoje só há Dockerfile de dev): adicionar scan de
  vulnerabilidade da imagem (Trivy `image`) + usuário non-root/HEALTHCHECK.
- **Vercel (prod)**: o gate continua no PR; o deploy segue manual/painel —
  reavaliar deploy automatizado com environments protegidos.
- **SLSA provenance / assinatura de artefatos** — relevante quando houver
  imagem publicada em registry.
