# syntax=docker/dockerfile:1
# =============================================================================
# ValCoach AI — imagem de DESENVOLVIMENTO (Node 20.9+ obrigatório).
#
# Fluxo de segredos (outside-in): NENHUMA credencial é copiada para a imagem.
# As variáveis chegam em runtime, injetadas na sessão do Docker Compose pela
# CLI do Infisical executada na máquina hospedeira:
#
#   infisical run --env=dev -- docker compose up --build
# =============================================================================
FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1

# Compatibilidade de binários nativos em Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Dependências primeiro (cache de camadas). Lockfile mantém a resolução
# exata — inclusive next@16.4.0 — sem novas resoluções de versão.
COPY --chown=node:node package.json package-lock.json* ./
USER node
RUN npm install

# Código-fonte (no dev ele chega pelo bind mount; o COPY garante uma
# imagem utilizável fora do compose, ex.: CI executando a suite Vitest).
COPY --chown=node:node . .

# Diretório de cache do Turbopack pertencente ao usuário não-root,
# que será montado como volume nomeado no docker-compose.yml.
RUN mkdir -p /app/.next

EXPOSE 3000

CMD ["npm", "run", "dev"]
