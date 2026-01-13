# ====== Base ======
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ====== Dependencies ======
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# ====== Development ======
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["pnpm", "dev"]

# ====== Builder ======
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm turbo build --filter=@repo/frontend

# ====== Production ======
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/frontend/dist ./dist
COPY --from=builder /app/apps/frontend/package.json ./

RUN npm install --omit=dev

EXPOSE 3000
CMD ["node", "dist/index.js"]
