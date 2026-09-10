# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.14.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS production-dependencies
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-prod,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM dependencies AS builder
ARG PRELAUNCH_MODE=false
ENV PRELAUNCH_MODE=${PRELAUNCH_MODE}
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV BRIEF_FONT_REGULAR=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
ENV BRIEF_FONT_BOLD=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
RUN pnpm generate:briefs
RUN pnpm build
RUN mkdir -p /app/runtime \
  && pnpm exec tsx -e "import { writeFileSync } from 'node:fs'; import { migrationSql } from './src/db/migrations.ts'; writeFileSync('/app/runtime/migration.sql', migrationSql);"

FROM node:${NODE_VERSION}-bookworm-slim AS web
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/data/kileni.sqlite
ENV PRIVATE_UPLOADS_PATH=/data/uploads
ENV BACKUP_PATH=/data/backups
ENV ADMIN_PDF_FONT_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
ENV ADMIN_PDF_FONT_BOLD_PATH=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/runtime ./runtime
COPY --from=builder --chown=node:node /app/scripts/docker-entrypoint.mjs ./scripts/docker-entrypoint.mjs
COPY --from=builder --chown=node:node /app/scripts/runtime-isolation.mjs ./scripts/runtime-isolation.mjs
COPY --from=builder --chown=node:node /app/scripts/backup.mjs ./scripts/backup.mjs
COPY --from=builder --chown=node:node /app/scripts/restore.mjs ./scripts/restore.mjs
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules-full
RUN rm -rf ./node_modules && mv ./node_modules-full ./node_modules
RUN mkdir -p /data/uploads /data/backups && chown -R node:node /data
USER node
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["sh", "-c", "node /app/scripts/docker-entrypoint.mjs && exec node server.js"]

FROM node:${NODE_VERSION}-bookworm-slim AS worker
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/data/kileni.sqlite
ENV PRIVATE_UPLOADS_PATH=/data/uploads
ENV BACKUP_PATH=/data/backups
ENV LIGHTHOUSE_CHROME_PATH=/usr/bin/chromium
ENV LIGHTHOUSE_NO_SANDBOX=true
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates chromium fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder --chown=node:node /app/dist-worker ./dist-worker
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
RUN mkdir -p /data/uploads /data/backups && chown -R node:node /data
USER node
STOPSIGNAL SIGTERM
CMD ["node", "dist-worker/worker.js"]
