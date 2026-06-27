FROM node:22-alpine AS builder

WORKDIR /app

COPY out-worker/json/ ./

RUN npm ci

COPY out-worker/full/ ./

RUN npx turbo run build --filter=@auction/worker

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist

COPY --from=builder /app/packages ./packages

CMD ["node", "apps/worker/dist/index.js"]