# syntax=docker/dockerfile:1

ARG NODE_VERSION=24-slim

# --- Build stage: install everything, generate the Prisma client, build the UI
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Prisma's schema engine (migrations) needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY client/package*.json ./client/
RUN npm ci --no-audit --no-fund --prefix client

COPY . .
RUN npx prisma generate \
  && npm run build --prefix client

# --- Runtime stage: production dependencies and build output only
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=5000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

COPY server.js ./
COPY src ./src
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/client/dist ./client/dist

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
