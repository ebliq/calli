FROM node:22-alpine AS base
# Installiere systemweite Abhängigkeiten (z.B. libc6-compat für native Module)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- Dependencies Stage ---
FROM base AS deps
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

RUN \
  if [ -f yarn.lock ]; then \
  yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
  npm ci; \
  elif [ -f pnpm-lock.yaml ]; then \
  corepack enable pnpm && pnpm install --frozen-lockfile; \
  else \
  echo "Lockfile not found." && exit 1; \
  fi

# --- Builder Stage ---
FROM base AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deaktiviere Next.js Telemetry
ENV NEXT_TELEMETRY_DISABLED=1

RUN \
  if [ -f yarn.lock ]; then \
  yarn run build; \
  elif [ -f package-lock.json ]; then \
  npm run build; \
  elif [ -f pnpm-lock.yaml ]; then \
  corepack enable pnpm && pnpm run build; \
  else \
  echo "Lockfile not found." && exit 1; \
  fi

# Prüfe, ob der Build Output vorhanden ist
RUN if [ ! -d "/app/.next/standalone" ]; then echo "Build output not found" && exit 1; fi

# --- Runner Stage (Production) ---
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Wechsel zum nicht privilegierten Benutzer
USER nextjs

# Exponiere den Port, auf dem der Server lauscht
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1

# Starte den Next.js-Server (server.js wird vom Next.js-Build erzeugt)
CMD ["node", "server.js"]