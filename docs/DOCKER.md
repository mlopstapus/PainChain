# PainChain Docker Configuration Guide

This document explains the Docker setup for PainChain, including development and production configurations.

## Table of Contents

- [Overview](#overview)
- [Docker Images](#docker-images)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

PainChain uses Docker for both development and production deployments. The architecture consists of:

- **Backend API** - FastAPI application (Python 3.12)
- **Celery Worker** - Background task processor
- **Celery Beat** - Task scheduler
- **Frontend** - React application (Vite)
- **PostgreSQL** - Database
- **Redis** - Message broker for Celery

### Key Design Decisions

1. **Single Backend Image**: API, Celery Worker, and Celery Beat all use the same Docker image with different commands
2. **Volume Mounts (Dev)**: Development uses volume mounts for hot-reloading
3. **Multi-arch Support**: Images built for both amd64 and arm64
4. **Environment-based Config**: All configuration via `.env` file

## Docker Images

### Backend Image (`backend/api/Dockerfile`)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy shared code and connectors
COPY shared/ /app/shared/
COPY connectors/ /app/connectors/

# Copy API requirements and install
COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy API code
COPY api/ /app/

EXPOSE 8000

# Default command (can be overridden)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Key Points:**
- Includes `connectors/` directory (required for connector tasks)
- Includes `shared/` directory (database models)
- Installs gcc for building Python packages
- Installs postgresql-client for database operations
- Default command runs API, but overridden for Celery workers

**Services Using This Image:**
1. `api` - Runs: `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
2. `celery-worker` - Runs: `celery -A celery_app worker --loglevel=info`
3. `celery-beat` - Runs: `celery -A celery_app beat --loglevel=info`

### Frontend Image (`frontend/Dockerfile`)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
```

**Key Points:**
- Node 20 Alpine for smaller image size
- Development server exposed on port 5173
- Vite dev server with `--host` flag for Docker networking

## Development Setup

### docker-compose.yml Structure

```yaml
services:
  db:
    image: postgres:16-alpine
    env_file: .env
    environment:
      POSTGRES_DB: painchain
      POSTGRES_USER: painchain
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./backend
      dockerfile: api/Dockerfile
    env_file: .env
    ports:
      - "8000:8000"
    volumes:
      - ./backend/api:/app
      - ./backend/shared:/app/shared
      - ./backend/connectors:/app/connectors
    depends_on:
      - db
      - redis
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  celery-worker:
    build:
      context: ./backend
      dockerfile: api/Dockerfile
    env_file: .env
    volumes:
      - ./backend/api:/app
      - ./backend/shared:/app/shared
      - ./backend/connectors:/app/connectors
    depends_on:
      - db
      - redis
    command: celery -A celery_app worker --loglevel=info

  celery-beat:
    build:
      context: ./backend
      dockerfile: api/Dockerfile
    env_file: .env
    volumes:
      - ./backend/api:/app
      - ./backend/shared:/app/shared
      - ./backend/connectors:/app/connectors
    depends_on:
      - db
      - redis
    command: celery -A celery_app beat --loglevel=info

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    env_file: .env
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - api
    command: npm run dev -- --host
```

### Volume Mounts Explained

**Backend Services:**
```yaml
volumes:
  - ./backend/api:/app          # API code hot-reload
  - ./backend/shared:/app/shared    # Shared models
  - ./backend/connectors:/app/connectors  # Connectors
```

**Why Volume Mounts:**
- Changes to Python files trigger `uvicorn --reload`
- No need to rebuild image during development
- Faster iteration cycle

**Frontend:**
```yaml
volumes:
  - ./frontend:/app              # Source code
  - /app/node_modules           # Don't overwrite node_modules
```

## Production Setup

For production, use the published images from GitHub Container Registry:

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    env_file: .env.production
    environment:
      POSTGRES_DB: painchain
      POSTGRES_USER: painchain
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  api:
    image: ghcr.io/<owner>/painchain-api:latest
    env_file: .env.production
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    restart: unless-stopped

  celery-worker:
    image: ghcr.io/<owner>/painchain-api:latest
    env_file: .env.production
    command: celery -A celery_app worker --loglevel=info
    depends_on:
      - db
      - redis
    restart: unless-stopped

  celery-beat:
    image: ghcr.io/<owner>/painchain-api:latest
    env_file: .env.production
    command: celery -A celery_app beat --loglevel=info
    depends_on:
      - db
      - redis
    restart: unless-stopped

  frontend:
    image: ghcr.io/<owner>/painchain-frontend:latest
    env_file: .env.production
    ports:
      - "5173:5173"
    depends_on:
      - api
    restart: unless-stopped

volumes:
  postgres_data:
```

**Key Differences from Development:**
1. Uses published images (no `build` section)
2. No volume mounts (code baked into image)
3. `restart: unless-stopped` for automatic recovery
4. Uses separate `.env.production` file

## Environment Configuration

### .env File Structure

The `.env` file only contains **sensitive** values. Non-sensitive configuration is hardcoded in `docker-compose.yml`.

```bash
# Database password - Change this to a strong password
DB_PASSWORD=your_secure_password_here

# Database connection string - Contains DB_PASSWORD
DATABASE_URL=postgresql://painchain:${DB_PASSWORD}@db:5432/painchain
```

**Note:** `REDIS_URL` and `VITE_API_URL` are configured directly in `docker-compose.yml` since they're not sensitive.

### Creating .env File

```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### Environment Variables by Service

**From `.env` file (sensitive):**
- `DB_PASSWORD` - PostgreSQL password (used by `db` service)
- `DATABASE_URL` - Full PostgreSQL connection string (used by `api`, `celery-worker`, `celery-beat`)

**Hardcoded in `docker-compose.yml` (not sensitive):**
- `REDIS_URL: redis://redis:6379/0` - Used by `api`, `celery-worker`, `celery-beat`
- `VITE_API_URL: http://localhost:8000` - Used by `frontend`
- `POSTGRES_DB: painchain` - Database name
- `POSTGRES_USER: painchain` - Database user

## Testing the Setup

### 1. Initial Setup

```bash
# Create .env file
cp .env.example .env

# Start all services
docker compose up -d

# Watch logs
docker compose logs -f
```

### 2. Verify All Containers Running

```bash
docker compose ps

# Expected output:
# NAME                    STATUS
# painchain-api           Up
# painchain-celery-beat   Up
# painchain-celery-worker Up
# painchain-db            Up (healthy)
# painchain-frontend      Up
# painchain-redis         Up (healthy)
```

### 3. Test API

```bash
# Health check
curl http://localhost:8000/

# API docs
curl http://localhost:8000/docs

# Test endpoint
curl http://localhost:8000/api/connections
```

### 4. Test Frontend

Navigate to: http://localhost:5173

Should see the PainChain dashboard.

### 5. Test Database Connection

```bash
docker compose exec db psql -U painchain -d painchain -c "\dt"
```

Should list database tables.

### 6. Test Celery

```bash
# Check worker logs
docker compose logs celery-worker

# Check beat logs
docker compose logs celery-beat
```

Should see Celery startup messages and periodic task schedules.

## Troubleshooting

### Problem: API Can't Connect to Database

**Error:** `password authentication failed for user "painchain"`

**Solution:**
1. Check `.env` file exists and has `DB_PASSWORD` set
2. Verify `db` service has `env_file: .env` in docker-compose.yml
3. Restart services: `docker compose down && docker compose up -d`
4. If database already existed with different password:
   ```bash
   docker compose down
   docker volume rm painchain_postgres_data
   docker compose up -d
   ```

### Problem: Frontend Can't Reach API

**Error:** `CORS policy: No 'Access-Control-Allow-Origin'`

**Solution:**
1. Check API CORS configuration in `backend/api/main.py`
2. Verify `VITE_API_URL` in `.env` matches API endpoint
3. Ensure API is running: `curl http://localhost:8000/`

### Problem: Connectors Not Found

**Error:** `ModuleNotFoundError: No module named 'connectors'`

**Solution:**
1. Verify `backend/api/Dockerfile` includes `COPY connectors/ /app/connectors/`
2. Rebuild image: `docker compose build api`
3. Check volume mounts in docker-compose.yml include connectors

### Problem: Frontend Missing Dependencies

**Error:** `Failed to resolve import "recharts"`

**Solution:**
```bash
# Install dependencies
docker compose exec frontend npm install

# Or rebuild frontend
docker compose build frontend
docker compose up -d frontend
```

### Problem: Port Already in Use

**Error:** `port is already allocated`

**Solution:**
```bash
# Find process using port
lsof -i :8000  # or :5173, :5432, etc.

# Kill the process or change port in docker-compose.yml
```

## Building Images Locally

### Build All Images

```bash
docker compose build
```

### Build Specific Service

```bash
docker compose build api
docker compose build frontend
```

### Build with No Cache

```bash
docker compose build --no-cache
```

### Test Production Build Locally

```bash
# Build without volume mounts
docker build -t painchain-api:test -f backend/api/Dockerfile backend/
docker build -t painchain-frontend:test -f frontend/Dockerfile frontend/

# Run API
docker run -d -p 8000:8000 \
  -e DATABASE_URL=postgresql://painchain:changeme@host.docker.internal:5432/painchain \
  -e REDIS_URL=redis://host.docker.internal:6379/0 \
  painchain-api:test

# Run Frontend
docker run -d -p 5173:5173 \
  -e VITE_API_URL=http://localhost:8000 \
  painchain-frontend:test
```

## CI/CD Integration

Images are automatically built and published via GitHub Actions:

- **On push to `main`:** `ghcr.io/<owner>/painchain-api:main`
- **On version tag:** `ghcr.io/<owner>/painchain-api:v0.1.0` and `:latest`

See [RELEASE.md](RELEASE.md) for full release process.

## Security Best Practices

### Sensitive Values (Keep Secret!)

Only **2 values** in `.env` are truly sensitive:
- `DB_PASSWORD` - Database password
- `DATABASE_URL` - Contains the database password

The other values (`REDIS_URL`, `VITE_API_URL`) are internal configuration and not sensitive since they're only accessible within the Docker network.

### Security Checklist

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use strong DB_PASSWORD** - Change from default `changeme`
   - Use 16+ characters with mixed case, numbers, symbols
   - Generate with: `openssl rand -base64 24`
3. **Rotate passwords regularly** - Update `.env` and restart services
4. **Use secrets management in production** - Docker secrets or external vault
   - For production, use Docker Swarm secrets or Kubernetes secrets
   - Never store secrets in environment variables in production
5. **Keep images updated** - Regularly rebuild with latest base images
6. **Scan for vulnerabilities** - Use `docker scan` or security scanning tools

## Performance Optimization

### Multi-stage Builds (Future Enhancement)

```dockerfile
# Build stage
FROM python:3.12-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Runtime stage
FROM python:3.12-slim
COPY --from=builder /root/.local /root/.local
COPY . .
CMD ["python", "app.py"]
```

### Image Size Optimization

- Use Alpine images where possible
- Clean up apt cache: `rm -rf /var/lib/apt/lists/*`
- Use `.dockerignore` to exclude unnecessary files

## Support

For Docker-related issues:
- Check logs: `docker compose logs [service]`
- GitHub Issues: `https://github.com/<owner>/painchain/issues`
- Label issues with `docker` tag
