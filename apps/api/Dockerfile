    FROM node:22-alpine AS builder

    WORKDIR /app
    
    COPY out-api/json/ ./
    
    RUN npm ci
    
    COPY out-api/full/ ./
    
    RUN npx turbo run build --filter=api
    
    FROM node:22-alpine AS runner
    
    WORKDIR /app
    
    
    COPY --from=builder /app/package.json ./
    COPY --from=builder /app/package-lock.json ./
    
    COPY --from=builder /app/node_modules ./node_modules
    
    COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
    COPY --from=builder /app/apps/api/dist ./apps/api/dist
    
    COPY --from=builder /app/packages ./packages
    
    EXPOSE 3001
    
    WORKDIR /app/apps/api
    
    CMD ["node", "dist/index.js"]