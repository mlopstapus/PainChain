# PainChain Dockerfile - NestJS API + React Frontend
FROM node:20-alpine3.20 AS base

# Install OpenSSL (required by Prisma)
RUN apk add --no-cache openssl openssl-dev

# Build stage
FROM base AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy packages
COPY packages ./packages
COPY apps/backend ./apps/backend
COPY frontend ./frontend

# Install dependencies
RUN npm ci

# Generate Prisma Client
RUN cd apps/backend && npx prisma generate

# Build the types package first
RUN npm run build --workspace=@painchain/types

# Build the backend application
RUN npm run build --workspace=@painchain/backend

# Build the frontend
RUN cd frontend && npm run build

# Production stage
FROM base AS production

WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json ./
COPY turbo.json ./

# Copy package.json for all packages
COPY packages/types/package.json ./packages/types/
COPY apps/backend/package.json ./apps/backend/

# Install production dependencies
RUN npm ci --omit=dev

# Copy built application
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

EXPOSE 8000

# Start the application
CMD ["node", "apps/backend/dist/main.js"]
