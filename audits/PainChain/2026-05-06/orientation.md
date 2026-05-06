# Orientation - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-orientation
**Auditor:** AnchorStack

## Project Snapshot

**Apparent purpose:** Unified change management and incident investigation platform. Aggregates change events (deployments, commits, CI runs, K8s changes) from independent connector containers into a single timeline so on-call engineers can trace production incidents back to root-cause changes.
**Product type:** Self-hosted SaaS app (free/localhost tier + managed SaaS tier planned)
**Primary users:** DevOps teams, SREs, platform engineers, engineering managers investigating production incidents.
**Sensitive workflows:** Auth (JWT + OIDC), multi-tenant user management, role-based access control, API key/token storage in Integration.config (JSON blob), session revocation.
**Maturity:** MVP — v2 rewrite is actively in progress; core backend and auth are implemented but README still says "Planning Phase."

The project is a v2 rewrite of a previously working FastAPI/React/Celery system (now in `deprecated/`). The new architecture uses NestJS + Prisma + React (Vite/Tailwind) with connectors as independent Docker containers that self-register. Multi-tenant auth (JWT + OIDC + RBAC) is implemented and largely complete. The event ingestion pipeline is present. Zero automated tests exist in the application source. The `.env` file (with real secrets) is committed to the repository.

## Stack

| Layer | Evidence | Notes |
|-------|----------|-------|
| Runtime/language | `painchain/backend/package.json` | Node.js 24 (Dockerfile), TypeScript 5.9 |
| Framework | `painchain/backend/src/app.module.ts` | NestJS 11 (backend); React 19 + Vite 7 (frontend) |
| Package manager | `painchain/backend/package-lock.json` | npm (per-package); no root workspace tooling in v2 |
| Database/ORM | `painchain/backend/prisma/schema.prisma` | PostgreSQL 16 via Prisma 7 |
| Auth | `painchain/backend/src/auth/` | Custom JWT (passport-jwt) + OIDC + RBAC + session DB table |
| Jobs/queues/cron | Connectors poll independently | No queue system; connectors run as separate Docker containers |
| Hosting/deploy | `docker-compose.yml`, `.github/workflows/build-main.yml` | Docker Compose (local); GHCR images + Helm (K8s) |
| Third-party APIs | `connectors/github/`, `connectors/gitlab/`, `connectors/kubernetes/` | GitHub, GitLab, Kubernetes APIs (via connectors) |

## Repository Map

| Area | Location | Notes |
|------|----------|-------|
| Main app entry points | `painchain/backend/src/main.ts`, `painchain/frontend/src/main.tsx` | NestJS bootstrap; React SPA entry. Backend serves frontend static files. |
| API routes/controllers | `painchain/backend/src/auth/auth.controller.ts`, `painchain/backend/src/events/`, `painchain/backend/src/integrations/`, `painchain/backend/src/teams/`, `painchain/backend/src/api/` | All routes prefixed `/api`. Auth, events, integrations, teams, timeline, projects. |
| UI/pages/components | `painchain/frontend/src/pages/`, `painchain/frontend/src/components/`, `painchain/frontend/src/features/auth/` | Home, Integrations pages. Auth feature folder with context, hooks, components. |
| Data models/schema | `painchain/backend/prisma/schema.prisma` | Tenant, User, Session, OIDCAccount, OIDCProvider, Integration, Event, Project, Team, ConnectorType, TenantInvitation |
| Auth/session/permissions | `painchain/backend/src/auth/` | JWT guard + Tenant guard applied globally. Roles: owner/admin/member/viewer. |
| Background jobs/webhooks | `connectors/github/src/`, `connectors/gitlab/src/`, `connectors/kubernetes/src/` | Polling-based connectors as separate containers. |
| Config/env | `.env.example`, `.env`, `docker-compose.yml` | `.env.example` exists. `.env` with real secrets is also present (red flag). |
| Tests | None found in app source | No `.spec.ts` or `.test.ts` files outside `node_modules`. CI workflow references `apps/backend` (old path — broken). |
| Docs/runbooks | `README.md`, `ARCHITECTURE.md`, `OIDC_IMPLEMENTATION.md`, `painchain/backend/MULTI_TENANT_IMPLEMENTATION.md`, `docs/contributing/` | Architecture and OIDC docs are detailed. README status section is stale (says "Planning Phase"). |

## Local Development

**Install command:** `npm install` (per package — backend: `painchain/backend/`, frontend: `painchain/frontend/`, each connector separately)
**Dev command:** Backend: `npm run start:dev` (in `painchain/backend/`); Frontend: `npm run dev` (in `painchain/frontend/`)
**Build command:** Backend: `npm run build`; Frontend: `npm run build` (tsc + vite); Full stack: `docker-compose up --build`
**Required services:** PostgreSQL 16 (provided via docker-compose)
**Environment setup:** `.env.example` exists with documented variables. `.env` is also committed (contains real DB password and JWT secret — critical issue).
**First-run confidence:** Medium — docker-compose path is clear, but local dev without Docker requires manual PostgreSQL setup and Prisma migration (`npx prisma db push`). No top-level dev script exists.

A new developer can run `docker-compose up` and get a working instance. Local non-Docker development requires per-package install steps and manual DB setup. The `.env` file being committed means any clone immediately has working secrets, but this is a security anti-pattern.

## Test And Quality Commands

| Check | Command | Evidence | Confidence |
|-------|---------|----------|------------|
| Tests | None (backend), none (frontend) | No test files found in app source | Low — CI references old `apps/backend` path |
| Lint | `npm run lint` | `painchain/frontend/eslint.config.js` | Medium — frontend only; no backend lint config found |
| Type check | `tsc -b` (frontend build), implicit via `nest build` | `tsconfig.json` in both apps | Medium |
| Build | `npm run build` (per package) | `package.json` scripts | High |
| CI | `.github/workflows/test.yml`, `build-main.yml` | `.github/workflows/` | Low — test.yml references `apps/backend` and `frontend` paths that no longer exist; CI is likely broken |

## Packaging And Shared Code

**Repo shape:** Hybrid — structured as a monorepo-by-convention but without workspace tooling in v2. Each deployable has its own `package.json` and `node_modules`.
**Workspace tooling:** None in v2 (deprecated/ had pnpm workspaces + Turborepo).
**Deployable units:** `painchain/` (backend + frontend, single Docker image), `connectors/github/`, `connectors/gitlab/`, `connectors/kubernetes/` (each its own Docker image).
**Shared packages:** None — no shared types package between backend/frontend/connectors in v2. Types are duplicated.
**Dependency direction:** Connectors depend on the backend API (`/api/events`, `/api/integrations`). Frontend depends on backend API. No cross-package TypeScript references enforced.

## Operational Maturity

| Area | Status | Evidence |
|------|--------|----------|
| CI/CD | Partial | `.github/workflows/` — build-main.yml pushes to GHCR; test.yml references stale paths |
| Deployment config | Present | `docker-compose.yml` (local), Helm chart referenced in CI (deprecated/ has chart; v2 chart path unclear) |
| Environment separation | Partial | `NODE_ENV` used; no staging vs production env files |
| Logging/error tracking | Partial | NestJS `Logger` used in auth controllers; no structured logging library or external error tracking |
| Database migrations | Partial | `prisma db push` used in docker-compose (destructive in prod); no migration files |
| Backup/recovery | Missing | No evidence of backup strategy |
| Health checks | Present | PostgreSQL healthcheck in docker-compose; no `/health` endpoint in backend |

## Security And Data Sensitivity Triage

**Data sensitivity:** Multi-tenant user PII (email, names), API tokens/keys stored in `Integration.config` JSON blob (unencrypted), session tokens, OIDC client secrets.
**Secret hygiene:** `.env` with real DB password (`CrazyCowardClowns11`) and JWT secret committed to repository. `.gitignore` lists `.env` but the file exists in git working tree (may be tracked). `.env.example` exists with appropriate placeholder values.
**Public/private route split:** `@Public()` decorator used on login/register/OIDC/invitation-lookup routes. `JwtAuthGuard` + `TenantGuard` applied globally via `APP_GUARD`. Generally well-structured.
**LLM/AI usage:** None identified in application code.

## AI Tooling Signals

| Signal | Evidence | Notes |
|--------|----------|-------|
| AI tool config | `.claude/settings.local.json` | Claude Code in use (this repo). `docs/contributing/CLAUDE.md` present. |
| Generated-code patterns | `painchain/backend/src/auth/auth.controller.ts` | Dense JSDoc comments on every method (typical AI-assisted style). Auth controller is 336 lines covering 12+ endpoints. |
| Commit/history signal | Not deeply inspected | Recent commits: "add multi-tenant auth", "feat(auth): create oidc for the backend" suggest rapid AI-assisted development |
| Generated docs | `OIDC_IMPLEMENTATION.md` (38KB), `ARCHITECTURE.md` (19KB) | Very detailed design docs; may be partially AI-generated |

## Audit Calibration

**Later skills should inspect deeply:**
- **Security**: `.env` with real secrets possibly tracked by git; API tokens stored unencrypted in `Integration.config`; CORS is wide open (`app.enableCors()` with no config); OIDC callback passes JWT token in URL query param (logged by servers/browsers).
- **Delivery/CI**: The test workflow references `apps/backend` and `frontend` paths that don't exist in v2. CI is likely broken or testing a ghost. The build-main workflow references a Helm chart at `./helm` which also doesn't exist in v2.
- **Code Quality**: Zero test coverage. Auth controller accesses private service members via `authService['sessionService']` (bracket notation on private). Role enforcement on `updateUserRole` and `removeUser` throws `NotFoundException` instead of `ForbiddenException`.
- **Architecture**: `prisma db push` used in production (bypasses migration history; can cause data loss on schema changes). No shared types between backend/frontend/connectors.
- **Data**: `Integration.config` stores API keys/tokens as plain JSON with no encryption at rest.

**Likely low-risk or not applicable areas:**
- Payment processing: Not applicable.
- File upload: Not identified.
- PHI/HIPAA: Not applicable.

**Missing context that limits confidence:**
- Whether `.env` is actually tracked by git (`git ls-files .env` not run — checked in security audit).
- Whether the deprecated Helm chart is intended for v2 or only for v1 (build-main.yml references `./helm`).
- No staging/production deployment evidence beyond docker-compose and CI Helm push.

**Suggested audit order adjustments:** Run security audit immediately after code quality — the committed `.env` and unencrypted secret storage are critical findings that color everything else.

## Findings

### Real Secrets Committed in .env

**Severity:** Critical
**Category:** Security Triage
**Location:** `.env`

The `.env` file contains a real database password (`CrazyCowardClowns11`) and a base64-encoded JWT signing secret. The `.gitignore` lists `.env` as ignored, but the file is present in the working tree and may be tracked. Any clone or fork of this repository would have working credentials.

**Recommendation:** Run `git ls-files .env` to confirm tracking status. If tracked, rotate all secrets immediately, remove from git history with `git filter-repo`, and add a pre-commit hook to prevent `.env` from being committed again.

---

### CI Workflows Reference Stale Paths

**Severity:** High
**Category:** Project Setup
**Location:** `.github/workflows/test.yml`, `.github/workflows/build-main.yml`

`test.yml` references `apps/backend` and `frontend` directories (v1 layout); `build-main.yml` references `./apps/backend/Dockerfile` and `./helm`. None of these paths exist in the v2 repository layout. CI is broken for the current codebase.

**Recommendation:** Update CI workflows to reference `painchain/backend/`, `painchain/frontend/`, and `painchain/Dockerfile`. Add frontend lint/typecheck steps. Verify Helm chart situation.

---

### No Automated Tests

**Severity:** High
**Category:** Project Setup
**Location:** `painchain/backend/src/`, `painchain/frontend/src/`

There are zero `.spec.ts` or `.test.ts` files in the application source directories. The auth, multi-tenant, and OIDC subsystems are complex and have no test coverage.

**Recommendation:** Add integration tests for auth flows (login, OIDC callback, invitation) at minimum. Use NestJS testing utilities with a test database.

---

### prisma db push Used in Production

**Severity:** High
**Category:** Project Setup
**Location:** `docker-compose.yml` line 44

The container startup command runs `npx prisma db push` which applies schema changes directly without migration history. This is destructive on schema changes and bypasses the audit trail that `prisma migrate` provides.

**Recommendation:** Switch to `prisma migrate deploy` with versioned migration files. Reserve `db push` for local development only.

---

### JWT Token Passed in URL on OIDC Callback

**Severity:** Medium
**Category:** Security Triage
**Location:** `painchain/backend/src/auth/auth.controller.ts:141`

After OIDC login, the JWT access token is appended as a URL query parameter (`?token=...`) and the user is redirected to the frontend. Tokens in URLs appear in server logs, browser history, and Referer headers.

**Recommendation:** Use a short-lived one-time code stored in the database instead. Frontend exchanges the code for a token via a POST request.

---

### Wide-Open CORS

**Severity:** Medium
**Category:** Security Triage
**Location:** `painchain/backend/src/main.ts:10`

`app.enableCors()` is called with no configuration, allowing any origin. This is acceptable for a self-hosted localhost tool but is a risk if the backend is ever publicly exposed.

**Recommendation:** Set explicit CORS origins from an environment variable; default to `localhost` origins for self-hosted tier.

---

### README Status Section Is Stale

**Severity:** Low
**Category:** Project Setup
**Location:** `README.md`

The README says "Phase: Planning and Architecture Design" with next steps that are already implemented (NestJS backend, event ingestion, frontend). Quick Start section says "Coming Soon."

**Recommendation:** Update README to reflect actual v2 status — the app runs and auth is implemented.

---

## Score

**Section score:** 6 / 10

Orientation is feasible — stack, purpose, and repo shape are clear. Score is reduced by: committed `.env` with real secrets (critical blocker), broken CI referencing v1 paths, zero test coverage, and `prisma db push` in production. Core architectural intent is well-documented and the codebase is navigable.

## Recommendations Summary

- [ ] Check `git ls-files .env`; if tracked, rotate secrets and purge from history
- [ ] Update `.github/workflows/test.yml` and `build-main.yml` to reference v2 paths
- [ ] Add integration tests for auth and event ingestion flows
- [ ] Replace `prisma db push` with `prisma migrate deploy` in the production container command
- [ ] Fix OIDC callback to pass token via short-lived code, not URL query param
- [ ] Restrict CORS to explicit allowed origins
- [ ] Update README to reflect actual implementation status
