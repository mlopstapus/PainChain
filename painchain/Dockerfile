# Multi-stage Dockerfile for PainChain (Frontend + Backend)
# This builds both the frontend and backend into a single production image

FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend for production
RUN npm run build

# ============================================

FROM node:24-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/
COPY backend/prisma.config.ts ./

# Install backend dependencies
RUN npm ci

# Generate Prisma Client (dummy DATABASE_URL for build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate
ENV DATABASE_URL=""

# Copy backend source
COPY backend/ ./

# Build backend
RUN npm run build

# ============================================

FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/prisma.config.ts ./prisma.config.ts

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 8000

CMD ["node", "dist/src/main.js"]
