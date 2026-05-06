# Infrastructure - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-infra
**Auditor:** AnchorStack

## Summary

PainChain's infrastructure posture matches its early-MVP stage: Docker Compose on a developer laptop with a self-hosted deployment story that is partially articulated but not yet safe to operate in production. The deployment stack (Compose for local, Helm for Kubernetes) is correctly scoped for a self-hosted product. The critical problems are (1) every CI/CD workflow references v1 paths that do not exist in v2 — the build, test, and Helm publish pipelines will fail on every run; (2) connector services mount their source code as Docker volumes in the Compose file, which is a development pattern that leaks host filesystem access into production containers; (3) PostgreSQL port 5432 is bound to the host network, making the database reachable outside the container network from any process or user with local access; (4) no Dockerfile in the project adds a non-root user; and (5) there is no staging environment, no image scanning, no TLS configuration, and no budget or cost controls. The infrastructure is rebuilt from repo artifacts (good), but the rebuild path is currently broken because the CI pipelines target stale paths.

## Infrastructure Map

**Hosting shape:** Self-hosted Docker Compose (local/on-prem). Container images published to GHCR for distribution. Helm chart (in `deprecated/`) intended for Kubernetes deployment, not yet wired to v2.
**Production location:** Unknown — no managed cloud provider, Vercel, Railway, Fly, or equivalent found. The product is designed for self-hosted deployment by end users.
**Environment posture:** Single environment — local only. No staging, no preview, no production separation. `NODE_ENV=production` is set in the Compose production target but there is no second environment with separate database, secrets, or configuration.
**Reproducibility:** Partial — `docker-compose up` rebuilds from repo artifacts plus `.env`. CI workflows reference stale v1 paths and will fail. Helm chart in `deprecated/` is not wired to v2 images or paths.
**Scaling posture:** No autoscaling. Single Docker Compose on one host. Database: one PostgreSQL container with default pool limits. No connection pooler. No CDN. No load balancer.
**Recovery posture:** No backups configured. Docker volume `postgres_data` is the only persistence mechanism with no WAL archiving, dump schedule, or managed backup. No restore procedure or runbook.
**Highest-risk infra assumption:** That `docker-compose up` is a safe production deploy mechanism despite `prisma db push` running at every startup (can silently destroy columns/tables) and connector containers mounting host source directories.

### Runtime And Hosting Inventory

| Unit/service | Hosted where | Runtime type | Responsibility | Evidence |
|--------------|--------------|--------------|----------------|----------|
| NestJS backend + React SPA | Docker container (self-hosted) | Node.js 24, Alpine | API + static file serving | `painchain/Dockerfile`, `docker-compose.yml` |
| PostgreSQL 16 | Docker container (self-hosted) | Alpine | All business state | `docker-compose.yml:5` |
| GitHub connector | Docker container (self-hosted) | Node.js 24, Alpine | Poll GitHub, push events | `connectors/github/Dockerfile` |
| GitLab connector | Docker container (self-hosted) | Node.js 24, Alpine | Poll GitLab, push events | `connectors/gitlab/Dockerfile` |
| Kubernetes connector | Docker container (self-hosted) | Node.js 24, Alpine | Poll K8s API, push events | `connectors/kubernetes/Dockerfile` |
| Container images | GHCR (`ghcr.io/<owner>/painchain-*`) | OCI | Distribution | `build-main.yml`, `release.yml` |
| Helm chart | `deprecated/helm/` | Helm 3 | Kubernetes deployment | `deprecated/helm/Chart.yaml` |

### Environments And Configuration

| Environment | URL/project/service | Data/backing services | Secret/config source | Parity/isolation risk |
|-------------|---------------------|-----------------------|----------------------|-----------------------|
| Local/Dev/Production (same) | `http://localhost:8000` | Single PostgreSQL Docker volume | `.env` file (committed to git) | No environment separation — one env for all purposes |
| Kubernetes (intent only) | Unknown | Unknown | Unknown — Helm values default `password: changeme` | Not wired to v2; Helm chart in deprecated/ |

### Infrastructure Definition

| Area | Mechanism | Evidence | Drift risk |
|------|-----------|----------|------------|
| App runtime | Docker Compose | `docker-compose.yml` | Low — file is version-controlled |
| Database | Docker volume `postgres_data` | `docker-compose.yml:17` | High — no IaC for volume lifecycle, backup, or restore |
| Secrets | `.env` file (tracked in git) | `git ls-files .env` → tracked | Critical — secrets in version control |
| Container images | `docker build` in CI (broken) | `build-main.yml` — v1 paths | High — CI references `./apps/backend/Dockerfile` (does not exist) |
| Helm chart | `deprecated/helm/` | `Chart.yaml` version 0.2.4 | High — not wired to v2 images; publish step fails (`cd helm` — dir does not exist in v2) |
| Network | Docker default bridge | `docker-compose.yml` | High — PostgreSQL port 5432 bound to host |
| TLS/HTTPS | None configured | No nginx, certbot, or ingress | High — no HTTPS in any deployment config |

### Scaling And Limits

| Area | Current control | Known limit | 10x load concern |
|------|-----------------|-------------|------------------|
| NestJS API | Single container, no autoscaling | Single process | OOM under load; no horizontal scale path |
| PostgreSQL | Default pg pool (10 connections) | PostgreSQL default 100 max_connections | Pool exhaustion with multiple connectors + JWT middleware DB writes |
| GitHub connector | `setInterval` polling, synchronous HTTP | GitHub rate limits (5,000/hr for auth) | Rate limit exceeded; no backpressure or queue |
| GitLab connector | Same polling pattern | GitLab rate limits | Same risk |
| Kubernetes connector | Same polling pattern | Kubernetes API limits | Same risk |
| Docker build (CI) | GitHub Actions `ubuntu-latest` | No explicit resource limit | Not a bottleneck at MVP scale |

### Deployment And Infra Gates

| Gate | Covers | Required? | Evidence |
|------|--------|-----------|----------|
| Docker build (CI) | Images — but references v1 paths | No (broken) | `build-main.yml` — `./apps/backend/Dockerfile` does not exist |
| Helm publish | Chart to GHCR — but `./helm` does not exist | No (broken) | `build-main.yml:publish-helm-main` — `cd helm` fails |
| Tests (CI) | Backend/frontend — references `apps/backend` | No (broken) | `test.yml` — stale path; also no test files exist |
| Helm chart lint | Helm template validation | PR only, Helm changes only | `helm-test.yml` — only fires when `helm/` path changes, which doesn't exist |
| Image scan | Container vulnerability scan | No | Not configured anywhere |
| Smoke test | Post-deploy health check | No | None |
| Secret scan | Pre-push/CI | No | None |
| Budget alert | Cost control | No | Not applicable (self-hosted) — no cloud cost surface |

### Recovery And SOC2 Evidence

| Control | Evidence | Assessment |
|---------|----------|------------|
| Database backups | None | Missing — Docker volume only; no pg_dump schedule |
| Restore procedure | None | Missing — no runbook or restore script |
| Rollback | Re-run `docker-compose up` with pinned image tag | Partial — works for app; `prisma db push` on startup is destructive |
| Access control | `.env` + Docker socket access | Missing — no IAM, no role separation, no audit log |
| Change evidence | Git commits + GitHub releases | Partial — commit history exists; CI is broken so change evidence is incomplete |
| Container scan | None | Missing |
| TLS/encryption in transit | None | Missing — all traffic on HTTP |
| Encryption at rest | None | Missing — unencrypted Docker volume |
| Availability monitoring | None | Missing — no uptime check, no alert |
| Incident runbook | None | Missing |

## Findings

### CI/CD Pipelines Reference Stale v1 Paths — Build, Test, And Helm Publish All Fail

**Severity:** Critical
**Category:** Deployment / CI Integrity
**Location:** `.github/workflows/build-main.yml:15,19`, `.github/workflows/release.yml:18,22`, `.github/workflows/test.yml:39,63`

All four CI/CD workflows (`build-main.yml`, `release.yml`, `test.yml`, `helm-test.yml`) target file paths from the v1 architecture that do not exist in v2:

- `build-main.yml` and `release.yml` build Docker images from `./apps/backend/Dockerfile` and `./frontend/Dockerfile` — neither path exists in v2. The actual Dockerfiles are at `painchain/Dockerfile` and `painchain/backend/Dockerfile`.
- `build-main.yml` and `release.yml` package and publish a Helm chart from `cd helm` — the `helm/` directory does not exist in v2 (it is in `deprecated/helm/`). Every push to `main` and every tagged release will fail at the Helm publish step.
- `test.yml` runs backend tests at `working-directory: apps/backend` and frontend tests at `working-directory: frontend` — the v2 paths are `painchain/backend/` and `painchain/frontend/`. Additionally, no test files exist in v2, so even if the paths were corrected, there is nothing to run.

The practical consequence is that no image has been automatically built, tested, or released from the v2 codebase via CI. Any GHCR images tagged `main` or `latest` reflect the v1 architecture.

**Recommendation:** Update all workflow file paths to match the v2 structure. For `build-main.yml` and `release.yml`, change the Docker build context/file references to `./painchain/Dockerfile`. For the Helm publish step, either wire it to `deprecated/helm/` (with updated image references) or remove it until a v2 Helm chart is written. For `test.yml`, update working directories and remove the test steps until test files exist. Create a working build gate for v2 before the next production deployment.

---

### Connector Containers Mount Host Source Directories — Development Pattern In Production Compose

**Severity:** High
**Category:** Container Security / Runtime Safety
**Location:** `docker-compose.yml:59,73,83`

The `docker-compose.yml` mounts the local source directory into running connector containers:

```yaml
github-connector:
  volumes:
    - ./connectors/github/src:/app/src

gitlab-connector:
  volumes:
    - ./connectors/gitlab/src:/app/src

kubernetes-connector:
  volumes:
    - ./connectors/kubernetes/src:/app/src
```

This is a hot-reload development pattern. In production, these mounts (1) override the compiled code baked into the container image with the local TypeScript source, which is not compiled and will not be executed correctly by Node.js; (2) expose the host filesystem path into the container, which is not appropriate for a production deployment; and (3) mean the container image content is irrelevant — anyone who modifies the local source directory modifies what is running in the container without a build or deploy step.

**Recommendation:** Remove the source volume mounts from all connector services in the production Compose file. The connector images already copy compiled `dist/` output. If hot-reload is desired for development, create a `docker-compose.override.yml` with the volume mounts that is not committed as the default configuration.

---

### PostgreSQL Port 5432 Exposed to Host Network

**Severity:** High
**Category:** Network Security
**Location:** `docker-compose.yml:16`

The PostgreSQL service binds port 5432 to `0.0.0.0:5432` (the Docker Compose default when `ports` is used without a bind address). This makes the database reachable from outside the container network — from any process on the host or, in a cloud VM deployment, from any host that can reach the server's IP on that port. Combined with the committed `DB_PASSWORD` and the absence of PostgreSQL `pg_hba.conf` hardening, this is a direct database exposure risk.

**Recommendation:** Remove the `ports:` block from the postgres service entirely if external access is not needed — Docker Compose internal networking (`painchain` connects to `postgres` by service name) works without port mapping. If pgAdmin or local psql access is needed during development, restrict the bind to `127.0.0.1:5432` in a `docker-compose.override.yml`.

---

### All Docker Containers Run As Root — No `USER` Directive In Any Dockerfile

**Severity:** High
**Category:** Container Security / Runtime Hardening
**Location:** `painchain/Dockerfile`, `painchain/backend/Dockerfile`, `connectors/github/Dockerfile`, `connectors/kubernetes/Dockerfile`

No Dockerfile in the repository creates a non-root user or uses a `USER` directive. All containers run as root (UID 0) by default. This is noted in the security audit and repeated here because it is an infrastructure-layer fix: it belongs in the Dockerfiles, not in application code. Running as root means any container escape or code execution vulnerability in a dependency gives an attacker root within that container, maximizing the blast radius.

**Recommendation:** Add the following to the production stage of each Dockerfile before the `CMD`: `RUN addgroup -S painchain && adduser -S painchain -G painchain && chown -R painchain:painchain /app` then `USER painchain`. This is an Alpine-compatible pattern with no operational cost. Apply to all five Dockerfiles.

---

### No Staging Environment — All Changes Go Directly To Production

**Severity:** High
**Category:** Environment Separation / Deployment Safety
**Location:** `docker-compose.yml`, `.env`

There is one environment — local Docker Compose — that serves as development, testing, and production simultaneously. There is no staging or preview environment with a separate database, separate secrets, or a separate deployment target. Schema changes (`prisma db push` at startup) apply immediately to the live database. Configuration changes apply without testing in a safe environment first. A developer adding a new feature and running `docker-compose up` on a production host applies both the schema change and the code change together with no rollback path.

**Recommendation:** Define a separate staging configuration — at minimum a `docker-compose.staging.yml` with a different DB port, a separate `postgres_data_staging` volume, and separate environment variables. For Kubernetes deployments, a separate namespace with a separate `values.yaml` suffices. The goal is one environment where destructive changes can be proven safe before touching production data.

---

### No Container Image Scanning In CI

**Severity:** Medium
**Category:** Supply Chain / Vulnerability Management
**Location:** `.github/workflows/build-main.yml`, `.github/workflows/release.yml`

No image vulnerability scan (Trivy, Grype, Docker Scout, Snyk) is configured in any CI workflow. The production images are built from `node:24-alpine` and include dependencies from npm. Alpine-based Node.js images still carry CVEs in system libraries. Connector images include `@octokit/rest`, `axios`, and the Kubernetes client — all third-party packages with known vulnerability histories. No scan runs on build or release, meaning vulnerabilities ship silently.

**Recommendation:** Add a Trivy scan step to `build-main.yml` after the Docker build step: `uses: aquasecurity/trivy-action@master` with `image-ref` set to the built image and `severity: 'CRITICAL,HIGH'`. Set `exit-code: 1` to block the push on critical findings. This integrates with GitHub's security tab via `format: sarif` and `output: trivy-results.sarif`.

---

### No TLS/HTTPS In Any Deployment Configuration

**Severity:** Medium
**Category:** Transport Security
**Location:** `docker-compose.yml`, `deprecated/helm/values.yaml`

The Docker Compose deployment serves all traffic over HTTP on port 8000. No nginx reverse proxy, Traefik, Caddy, or cert-manager TLS configuration is present. The Helm chart values.yaml has TLS commented out as an example with `tls: []`. The OIDC callback URL (`AUTH_URL`, `FRONTEND_URL`) is configured as `http://localhost:8000` in `.env`. JWT tokens, session credentials, API tokens, and user PII all transit in cleartext between the browser and the server in any deployment that is not localhost-only.

**Recommendation:** Add a Caddy or nginx reverse-proxy service to the Compose file for production deployments, configured to terminate TLS with Let's Encrypt. For Kubernetes, enable the cert-manager section in the Helm values and configure the ingress TLS block. Document in the README that HTTPS is required for any deployment that is not purely localhost.

---

### `prisma db push` Runs At Every Container Startup — Destructive Schema Changes On Deploy

**Severity:** Medium
**Category:** Deployment Safety / Data Integrity
**Location:** `docker-compose.yml:44`

The production startup command is `sh -c "npx prisma db push && node dist/src/main.js"`. `prisma db push` applies schema diffs destructively — it will drop columns or tables that are no longer in `schema.prisma`. This runs on every `docker-compose up`, including restarts triggered by `restart: unless-stopped`. A schema change merged to main and deployed via compose can silently delete production data without a migration step, a backup, or a rollback path. This is raised in the data audit and repeated here as a deployment-layer finding because the fix is to the Compose startup command.

**Recommendation:** Replace `npx prisma db push` with `npx prisma migrate deploy` in the Compose command, and first generate an initial migration with `prisma migrate dev` (from the data audit recommendation). `migrate deploy` applies only versioned, reviewed migrations — it does not apply destructive diffs not captured in migration files.

---

## Score

**Section score:** 2 / 10

The infrastructure is coherent for a local development environment and the self-hosted deployment model is the right choice for the product. Everything beyond "can be rebuilt from docker-compose up" is missing or broken. CI/CD pipelines fail on every run because they reference v1 paths. The Helm chart needed to deploy to Kubernetes lives in `deprecated/` and is not wired to v2. Connector containers mount host source code in what appears to be the production Compose file. The database is exposed to the host network. All containers run as root. No staging environment, no TLS, no image scanning, and no backups exist. The infrastructure is suitable for a single developer running locally, not for a self-hosted product that stores GitHub PATs, GitLab tokens, and user PII for production teams.

## Recommendations Summary

- [ ] Fix all CI/CD workflow paths to target v2 directory structure (`painchain/Dockerfile`, `painchain/backend/`, `painchain/frontend/`) — the current pipelines fail on every push to main
- [ ] Remove source volume mounts from connector services in `docker-compose.yml` and restrict `postgres:` to `127.0.0.1:5432` or no port binding
- [ ] Add `USER painchain` to all five Dockerfiles after creating a non-root user
- [ ] Replace `prisma db push` with `prisma migrate deploy` in the Compose startup command; add Trivy image scanning to the build workflow
- [ ] Document and configure a staging environment (separate volume, separate `.env`) before any real-user deployment
