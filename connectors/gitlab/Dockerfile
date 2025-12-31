# PainChain GitLab Connector Dockerfile

FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production image
FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy metadata.json
COPY metadata.json ./metadata.json

# Environment variables (defaults)
ENV BACKEND_API_URL=http://backend:8000/api
ENV POLLING_INTERVAL=60

EXPOSE 8080

CMD ["node", "dist/index.js"]
