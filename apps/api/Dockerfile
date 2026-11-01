# ===================================================
# Stage 1: Builder
# ===================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root monorepo files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy API source and Prisma schema
COPY apps/api ./apps/api

# Generate Prisma client and compile TypeScript
WORKDIR /app/apps/api
RUN pnpm prisma generate
RUN pnpm build

# ===================================================
# Stage 2: Production Runner
# ===================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Security: Create non-root system user
RUN addgroup --system --gid 1001 chithigroup && \
    adduser --system --uid 1001 chithiuser

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy build output, Prisma schema and dependencies
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./package.json

# Create uploads directory and assign ownership
RUN mkdir -p /app/uploads && chown -R chithiuser:chithigroup /app

USER chithiuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]
