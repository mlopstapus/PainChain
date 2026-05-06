# PainChain — AnchorStack Production Readiness Audit

**Date:** 2026-05-06
**Auditor:** AnchorStack
**Repo:** `git@github.com:mlopstapus/PainChain.git`
**Branch:** `checkout/start-from-scratch`
**Commit:** `d10704358375351525708e74c42c69f0684eabde`

---

## Executive Summary

PainChain v2 is a well-conceived change-aggregation platform for incident investigation teams. The connector-based architecture is sound: independent Docker containers self-register with the backend, push events over HTTP, and the core multi-tenant auth system — JWT + OIDC + RBAC + session revocation — is technically well-designed. The v2 rewrite has produced a functional MVP.

The system cannot safely protect its users, their data, or their API credentials in its current state. Five of six API controllers are decorated as public — bypassing the auth system entirely — which means GitHub PATs, GitLab tokens, Kubernetes credentials, and all user data are freely readable and writable by any unauthenticated HTTP caller with network access to port 8000. Production credentials (database password, JWT signing key) are committed to the git repository and present in the full history of every clone. No database backups exist. Schema changes are applied destructively at container startup with no migration history and no rollback path. No tests, no CI gates, and no PR review have been applied to any line of v2 code.

Remediation requires closing four to six critical security and data integrity gaps before any external network exposure, followed by establishing the foundational delivery infrastructure — versioned migrations, tests, CI, and branch protection — needed to evolve the system safely.

---

## Verdict

**Overall Score:** 2.6 / 10
**Status:** Fail
**Verdict:** Unsafe to operate

> Multiple Critical findings in Security, Data, Infrastructure, and Delivery. The application stores and exposes third-party API credentials without authentication or encryption. Production secrets are committed to version control. No backups exist. No automated verification has been applied to the v2 codebase. Immediate remediation is required before any real-user deployment.

---

## Scorecard

| Area | Score | Weight | Weighted | Status |
|------|-------|--------|----------|--------|
| Security | 2/10 | ×1.5 | 3.0 | Fail |
| Architecture | 4/10 | ×1.0 | 4.0 | Fail |
| Data | 3/10 | ×1.5 | 4.5 | Fail |
| AI Engineering | 3/10 | ×1.0 | 3.0 | Fail |
| Infrastructure | 2/10 | ×1.0 | 2.0 | Fail |
| Observability | 1/10 | ×1.0 | 1.0 | Fail |
| Code Quality | 3/10 | ×1.0 | 3.0 | Fail |
| Delivery | 2/10 | ×1.0 | 2.0 | Fail |
| Documentation | 3/10 | ×1.0 | 3.0 | Fail |
| **Overall** | **2.6/10** | — | **25.5/10.0** | **Fail** |

**Finding counts:** 16 Critical · 30 High · 26 Medium · 4 Low · **76 total**

---

## Top Risks

### 1 · SEC-001 · Critical · Security
**All data endpoints operate without authentication — third-party API credentials are reachable by any network caller**

Five of six controllers are decorated `@Public() // Temporary: Allow unauthenticated access during migration`. `GET /api/integrations` returns all integrations including the `config` JSON field containing live GitHub Personal Access Tokens, GitLab tokens, and Kubernetes credentials — in plaintext — to any unauthenticated caller with network access to port 8000. Any caller can also `POST /api/events` to inject events for any tenant, `PUT/DELETE /api/integrations/:id` to modify or destroy integrations, and read all user, team, and project data.

See `security.md` → "All Data API Endpoints Are Unauthenticated" and `code-quality.md` → "Five Controllers Permanently Marked @Public()".

### 2 · DAT-001 · Critical · Data
**Third-party API credentials stored unencrypted in the database**

`Integration.config` is a `Json` column storing connector API tokens (GitHub PATs, GitLab tokens, Kubernetes credentials) as plaintext. `OIDCProvider.clientSecret` is a plain `String` column. Any party with database read access, SQL injection capability, or access to a future database backup retrieves live production credentials in full.

See `data.md` → "API Tokens Stored in Plaintext in Integration.config JSON Column" and "OIDC Client Secrets Stored in Plaintext Database Column".

### 3 · SEC-002 · Critical · Security
**Production credentials committed to version control and present in full repository history**

`.env` is tracked by git (`git ls-files .env` confirms) and contains the production database password and the base64-encoded JWT signing secret. `.claude/settings.local.json` (also tracked) contains a full JWT bearer token hardcoded in an allowed Bash command. Both files have been in the repository since initial commit with no evidence of rotation. Anyone with repository access — including any CI runner, future contributor, or fork — has these credentials.

See `security.md` → ".env With Real Credentials Committed" and `ai-engineering.md` → "Real JWT Token Hardcoded in Tracked Settings File".

### 4 · DAT-002 · Critical · Data
**No database backup mechanism — all product data unrecoverable on failure**

The PostgreSQL database runs on Docker volume `postgres_data` with no WAL archiving, no dump schedule, no managed backup service, and no restore procedure. The startup command (`prisma db push`) also applies schema diffs destructively — dropping columns removed from the schema — so a schema change combined with a container restart can destroy production data in one operation with no rollback path.

See `data.md` → "No Database Backups Configured" and "No Versioned Migrations — Schema Applied via `prisma db push`".

### 5 · DEL-001 · Critical · Delivery
**All v2 production code committed without automated verification or human review**

All v2 development (December 2025–January 2026) was committed directly to `checkout/start-from-scratch` with no pull requests, no required CI checks, and no automated tests. The OIDC auth system (3,956 lines, commit `4a5a884`) and multi-tenant model (2,839 lines, commit `d107043`) landed as direct commits without review. All four CI/CD workflows are broken — they reference v1 file paths that do not exist in v2. No automated process has run against any line of v2 code.

See `delivery.md` → "V2 Development Commits Directly to Branch" and "All CI/CD Workflows Are Broken".

---

## Priority Remediation Plan

### Immediate (before any external network access)

1. **Rotate all exposed credentials.** The database password and JWT signing secret in `.env` must be rotated. The JWT bearer token in `.claude/settings.local.json` must be revoked. All active sessions should be purged after the JWT secret rotation (`DELETE FROM sessions`).

2. **Remove tracked credential files from git.** Run `git rm --cached .env` and `git rm --cached .claude/settings.local.json`. Add both to `.gitignore`. Then run `git filter-repo --path .env --invert-paths` to remove `.env` from history. Rebuild `.claude/settings.local.json` without embedded credentials.

3. **Remove `@Public()` from all non-auth controllers.** `events.controller.ts`, `integrations.controller.ts`, `teams.controller.ts`, `timeline.controller.ts`, `projects.controller.ts` — remove the decorator. For server-to-server connector event ingestion, introduce a connector API key (env var) validated in a guard. Use `validatedTenantId` from `TenantGuard` in all data queries.

4. **Register `ValidationPipe` globally.** Add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` to `main.ts`. Add DTOs for event creation and integration creation.

5. **Configure a database backup.** Add a `pg_dump` cron job to `docker-compose.yml` or switch to a managed PostgreSQL service with point-in-time recovery. Document and test the restore procedure before deploying to any environment with real data.

### Short-term (within one sprint)

6. **Generate initial Prisma migration.** Run `prisma migrate dev --name initial` to create a migration file. Commit `prisma/migrations/`. Replace `prisma db push` in `docker-compose.yml` startup command with `prisma migrate deploy`. Require migration files in all future PRs that change `schema.prisma`.

7. **Fix CI/CD workflow paths.** Update `build-main.yml`, `release.yml`, and `test.yml` to target v2 paths (`painchain/Dockerfile`, `painchain/backend/`, `painchain/frontend/`). Fix the Helm publish step to target the `deprecated/helm/` chart or create a v2 chart. Enable required status checks on the `main` branch in GitHub branch protection.

8. **Add foundational tests.** Write integration tests for the auth critical path using `@nestjs/testing`: successful login, failed login, 401 without JWT, 401 with revoked session, tenant isolation (user A cannot read tenant B's data). Six tests provide meaningful regression protection.

9. **Add `helmet()` and restrict CORS.** Add `import helmet from 'helmet'; app.use(helmet())` to `main.ts`. Replace `app.enableCors()` with `app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') })`.

10. **Wire `express-rate-limit`.** The package is installed but never registered. Add rate limiting to `POST /api/auth/login` and `POST /api/auth/register` (10 requests per 15 minutes per IP).

### Medium-term (before production launch)

11. **Encrypt secrets at rest.** Apply field-level encryption to `Integration.config` (API tokens) and `OIDCProvider.clientSecret` using `@prisma/extension-field-encryption` or equivalent. Keys in environment variables, not in the database.

12. **Add minimum viable observability.** Install `@sentry/nestjs` and `@sentry/react`. Add `GET /api/health` using `@nestjs/terminus`. Register a free UptimeRobot monitor. Add a connector heartbeat to detect silent polling failures.

13. **Replace URL token delivery in OIDC callback.** Store a short-lived one-time code in the database (TTL 30s), redirect to `${frontendUrl}/auth/callback?code=<random>`, and exchange via `POST /api/auth/exchange-code`. The JWT token should never appear in a URL.

14. **Add non-root users to all Dockerfiles.** Add `RUN addgroup -S painchain && adduser -S painchain -G painchain && chown -R painchain:painchain /app` and `USER painchain` before `CMD` in all five Dockerfiles.

15. **Replace CLAUDE.md with a project-specific version.** Write a root-level `CLAUDE.md` covering: NestJS module pattern, multi-tenant isolation rule (every data query must include `tenantId`), `@Public()` policy, `ValidationPipe` requirement, and migration rule. Remove `.claude/settings.local.json` from git.

---

## Domain Summaries

### Security (2/10) — `security.md`
The OIDC auth design is technically sound — AES-256 state encryption, nonce validation, timestamp expiry, bcrypt-12 passwords — but is architecturally bypassed on all data endpoints via `@Public()`. Five controllers expose the full data surface (events, integrations with API tokens, teams, timeline, projects) to any unauthenticated caller. Real credentials are committed to git in two separate files. `express-rate-limit` is installed but never wired. No security headers, no CORS restriction, no container hardening, no vulnerability scanning, no pre-commit secret hooks.

### Architecture (4/10) — `architecture.md`
The connector container model is a good fit for the product's self-hosted positioning. Critical gaps: events transit via synchronous HTTP with no queue, meaning any backend outage silently drops the events that are the product's core value. Every authenticated request writes to the database for session validation with no caching. Schema is modified destructively at startup. Tags stored in JSON are not indexable. Connector metadata registration is unauthenticated, allowing any caller to overwrite schema definitions.

### Data (3/10) — `data.md`
The Prisma schema is coherent and the event deduplication unique constraint is correct. All operational posture is critically weak: no versioned migrations, no backups, plaintext API tokens and OIDC secrets in the database, no transactions on multi-step registration and login flows, a race condition on invitation use, and role/status fields as unconstrained strings with no database-level enforcement.

### AI Engineering (3/10) — `ai-engineering.md`
Claude Code is clearly the primary development tool and has produced working, thoughtfully-designed code from detailed planning documents. The AI workflow has a critical safety failure: a real authentication token and database password are hardcoded in the tracked tool-settings file. The only agent context file is generic (8 rules applicable to any project) and gives no guidance on the most important safety invariants — tenant isolation and safe use of `@Public()`. Large single-commit AI-assisted features arrive without tests, CI, or a gate to close temporary bypasses.

### Infrastructure (2/10) — `infra.md`
Docker Compose for self-hosted deployment is appropriate for the product model. The execution is not production-ready: all four CI/CD workflows fail because they reference v1 paths. Connector containers mount host source directories in what appears to be the production Compose file. The database port is exposed to the host network. All containers run as root. No staging environment, TLS, image scanning, or budget controls exist. The Helm chart for Kubernetes lives in `deprecated/` and is not wired to v2.

### Observability (1/10) — `observability.md`
Zero production observability. No error tracking, no uptime monitoring, no metrics, no alerts, no health endpoint, no log aggregation. Logging is a mix of NestJS `Logger` (some services) and `console.*` calls (connectors, database init, timeline query timing). No correlation IDs. Failed authentication attempts are not logged. Connector failures produce console output that disappears on container restart with no alert.

### Code Quality (3/10) — `code-quality.md`
The auth subsystem is thoughtfully structured. Critical code quality gaps: `ValidationPipe` is never registered (all DTO decorators are inert); TypeScript strict mode is disabled in the backend (`strictNullChecks: false`, `noImplicitAny: false`); zero application tests; the `update()` and `remove()` methods in `IntegrationsService` accept `tenantId` but ignore it in the database query; seven debug `console.error` blocks in the high-volume event deduplication path; the auth controller accesses private service members via bracket notation.

### Delivery (2/10) — `delivery.md`
V1 showed genuine delivery maturity (feature branches, PRs, versioned releases). V2 has abandoned all of it: direct commits to a long-running branch, no PR review, no CI, no tests, broken CI workflows targeting v1 paths, no migration gate, and a release process document that describes v1 architecture. The `feature/add-tests` branch acknowledges the gap but no tests have been produced.

### Documentation (3/10) — `docs.md`
Connector READMEs and the OIDC configuration guide are current and usable. Everything else visible to new contributors and AI agents is inaccurate: the README says "Planning Phase" and "Coming Soon" while the system is functional; three large implementation plan documents describe unstarted work that has been complete for months; `features.json` describes the v1 FastAPI/Celery stack; `CLAUDE.md` references tools that don't exist in this project. No operational runbooks exist. `.env.example` is missing six environment variables read by the application.

---

## Audit Coverage

| Domain | File | Status | Score |
|--------|------|--------|-------|
| Orientation | `orientation.md` | Complete | 6/10 (context only) |
| Security | `security.md` | Complete | 2/10 |
| Architecture | `architecture.md` | Complete | 4/10 |
| Data | `data.md` | Complete | 3/10 |
| AI Engineering | `ai-engineering.md` | Complete | 3/10 |
| Infrastructure | `infra.md` | Complete | 2/10 |
| Observability | `observability.md` | Complete | 1/10 |
| Code Quality | `code-quality.md` | Complete | 3/10 |
| Delivery | `delivery.md` | Complete | 2/10 |
| Documentation | `docs.md` | Complete | 3/10 |

---

## Appendix: Findings

All findings are catalogued below by domain. Each finding includes its severity, location, and recommendation. For full finding body text, see the individual domain files in `audits/PainChain/2026-05-06/`.

### Security Findings (`security.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| SEC-001 | Critical | .env With Real Credentials Committed to Git | `.env` |
| SEC-002 | Critical | All Data API Endpoints Unauthenticated — API Tokens Exposed | `integrations.controller.ts:39`, `events.controller.ts:26`, `teams.controller.ts:17`, `timeline.controller.ts:5`, `projects.controller.ts:5` |
| SEC-003 | High | No Rate Limiting on Auth Endpoints | `main.ts`, `package.json:33` |
| SEC-004 | High | JWT Token Passed as URL Query Parameter on OIDC Callback | `auth.controller.ts:141` |
| SEC-005 | High | Open Registration Enabled With No Abuse Controls | `.env:26`, `auth.service.ts:84` |
| SEC-006 | High | All Docker Containers Run as Root | `painchain/Dockerfile`, connector Dockerfiles |
| SEC-007 | High | No Security Headers Configured | `main.ts` |
| SEC-008 | Medium | JWT Signing Secret Reused as OIDC State Encryption Key | `oidc.service.ts:36` |
| SEC-009 | Medium | No Vulnerability Scanning, SAST, or Dependency Scanning in CI | `.github/workflows/` |
| SEC-010 | Medium | OIDC Provider URLs Fetched Without Validation — Potential SSRF | `oidc.service.ts:72,106` |
| SEC-011 | Medium | ValidationPipe Not Registered — All Input Accepted Without Validation | `main.ts` |
| SEC-012 | Low | Session Table Grows Without Cleanup | `session.service.ts:104` |

### Architecture Findings (`architecture.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| ARC-001 | Critical | No Queue Between Connectors and Backend — Events Silently Lost | `connectors/github/src/`, `docker-compose.yml` |
| ARC-002 | Critical | `prisma db push` Used as Production Migration Command | `docker-compose.yml:44` |
| ARC-003 | Critical | All Data Endpoints Unauthenticated — Connector and User APIs Share One Unprotected Surface | (see SEC-002) |
| ARC-004 | High | Every Authenticated Request Hits the Database Twice With No Session Caching | `jwt.strategy.ts` |
| ARC-005 | High | Session Cleanup Method Exists But Is Never Called | `session.service.ts:104` |
| ARC-006 | High | Connector Polling Has No Cursor — Duplicate Processing On Every Cycle | `github-poller.ts` |
| ARC-007 | Medium | Tag Filtering Loads All Integrations Into Memory | `timeline.service.ts:23-47` |
| ARC-008 | Medium | Connector Metadata Registration Has No Auth and Allows Overwrite | `integration-types.controller.ts` |

### Data Findings (`data.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| DAT-001 | Critical | No Versioned Migrations — Schema Applied via `prisma db push` | `docker-compose.yml:44`, `prisma.config.ts` |
| DAT-002 | Critical | API Tokens Stored in Plaintext in Integration.config JSON Column | `schema.prisma:45` |
| DAT-003 | Critical | OIDC Client Secrets Stored in Plaintext Database Column | `schema.prisma:201` |
| DAT-004 | Critical | No Database Backups Configured | `docker-compose.yml` |
| DAT-005 | High | Invitation useCount Has TOCTOU Race Condition | `invitation.service.ts:86-120` |
| DAT-006 | High | User Registration Has No Wrapping Transaction | `auth.service.ts:82-186` |
| DAT-007 | High | OIDC User Creation Not Wrapped in a Transaction | `auth.service.ts:295-319` |
| DAT-008 | Medium | Role, Status, and Connector Type Are Free-Form Strings Without DB Constraints | `schema.prisma:155,43,101` |
| DAT-009 | Medium | `User.isActive = false` Soft Delete Has No `deletedAt` Timestamp | `schema.prisma:148` |
| DAT-010 | Medium | Connection Pool Has No Explicit Limits | `prisma.service.ts:10` |
| DAT-011 | Low | `OIDCAccount.claims` Stores Full OIDC Response — PII Accumulation | `schema.prisma:179` |

### AI Engineering Findings (`ai-engineering.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| AIE-001 | Critical | Real JWT Token Hardcoded in Tracked `.claude/settings.local.json` | `.claude/settings.local.json` |
| AIE-002 | High | CLAUDE.md Is Generic and References Non-Existent Tools | `docs/contributing/CLAUDE.md` |
| AIE-003 | Medium | AI-Assisted Implementation Plans Left as Large Stale Docs After Feature Delivery | `OIDC_IMPLEMENTATION.md`, `MULTI_TENANT_IMPLEMENTATION.md`, `FRONTEND_AUTH_PLAN.md` |
| AIE-004 | Medium | Large Single-Commit AI-Assisted Features Without Test Evidence | Commits `4a5a884`, `d107043`, `0268738` |
| AIE-005 | Medium | Claude Code Has Permission to Run `docker exec` and `curl` Without Scope Restriction | `.claude/settings.local.json:8,9` |
| AIE-006 | Low | `features.json` Is Stale and Reflects v1 Architecture | `features.json` |

### Infrastructure Findings (`infra.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| INF-001 | Critical | CI/CD Pipelines Reference Stale v1 Paths — Build, Test, And Helm Publish All Fail | `.github/workflows/build-main.yml`, `release.yml`, `test.yml` |
| INF-002 | High | Connector Containers Mount Host Source Directories — Development Pattern In Production Compose | `docker-compose.yml:59,73,83` |
| INF-003 | High | PostgreSQL Port 5432 Exposed to Host Network | `docker-compose.yml:16` |
| INF-004 | High | All Docker Containers Run As Root — No `USER` Directive In Any Dockerfile | All Dockerfiles |
| INF-005 | High | No Staging Environment — All Changes Go Directly To Production | `docker-compose.yml`, `.env` |
| INF-006 | Medium | No Container Image Scanning In CI | `.github/workflows/` |
| INF-007 | Medium | No TLS/HTTPS In Any Deployment Configuration | `docker-compose.yml`, `deprecated/helm/values.yaml` |
| INF-008 | Medium | `prisma db push` Runs At Every Container Startup | `docker-compose.yml:44` |

### Observability Findings (`observability.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| OBS-001 | High | No Error Tracking — Backend Exceptions Silently Swallowed or Written to Ephemeral Stdout | `painchain/backend/src/`, `painchain/frontend/src/` |
| OBS-002 | High | No Uptime Monitoring or Health Endpoint — Downtime Is Invisible | `main.ts` |
| OBS-003 | High | Connector Failures Are Silent — Event Ingestion Can Stop Without Any Alert | `connectors/github/src/github-poller.ts:49,77` |
| OBS-004 | High | Logging Is Unstructured, Inconsistent, and Uses Mixed Mechanisms | `painchain/backend/src/`, `connectors/` |
| OBS-005 | Medium | Failed Login Attempts Are Not Logged — Brute Force Is Invisible | `auth.service.ts:49-74` |
| OBS-006 | Medium | No Request/Correlation IDs — Incidents Cannot Be Traced Across Services | `main.ts`, all controllers |

### Code Quality Findings (`code-quality.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| COD-001 | Critical | Five Controllers Permanently Marked @Public() "During Migration" | `events.controller.ts:26`, `integrations.controller.ts:39`, `teams.controller.ts:17`, `timeline.controller.ts:5`, `projects.controller.ts:5` |
| COD-002 | Critical | ValidationPipe Not Registered — DTO Decorators Do Nothing | `main.ts` |
| COD-003 | High | Backend TypeScript Strict Mode Disabled | `painchain/backend/tsconfig.json` |
| COD-004 | High | Zero Application Tests | `painchain/backend/src/`, `painchain/frontend/src/` |
| COD-005 | High | Debug Console Blocks Left in Production EventsService | `events.service.ts:25-52` |
| COD-006 | High | IntegrationsService.update and .remove Ignore tenantId Parameter | `integrations.service.ts:29-43` |
| COD-007 | Medium | Controller Accesses Private Service Members via Bracket Notation | `auth.controller.ts:175,187` |
| COD-008 | Medium | Role Enforcement Uses NotFoundException Instead of ForbiddenException | `auth.controller.ts:313,325` |
| COD-009 | Medium | Integration Config Stored as Opaque JSON with No Runtime Validation | `integrations.controller.ts:25-37` |
| COD-010 | Medium | Frontend API Client Returns Untyped Responses for Core Endpoints | `frontend/src/api/client.ts:186-267` |
| COD-011 | Low | Tag Filtering Implemented with In-Memory Filtering, Not DB Query | `timeline.service.ts:23-47` |

### Delivery Findings (`delivery.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| DEL-001 | Critical | V2 Development Commits Directly to Branch — No Pull Requests, No Review | `checkout/start-from-scratch` branch |
| DEL-002 | Critical | All CI/CD Workflows Are Broken — No Automated Gate Has Run Against V2 | `.github/workflows/` |
| DEL-003 | Critical | Zero Tests — No Automated Verification Of Any Application Behavior | `painchain/backend/src/`, `painchain/frontend/src/` |
| DEL-004 | High | Release Process Documentation Describes V1 Architecture | `docs/contributing/RELEASE.md` |
| DEL-005 | High | No Migration Gate In Release Process | `docker-compose.yml:44` |
| DEL-006 | Medium | One CI Action Pinned to `@master` — Mutable Dependency in Build Pipeline | `.github/workflows/helm-test.yml:86` |
| DEL-007 | Medium | CHANGELOG Absent — No Release Notes For Any V2 Delivery | Repository root |

### Documentation Findings (`docs.md`)

| ID | Severity | Title | Location |
|----|----------|-------|----------|
| DOC-001 | High | Main README Says "Planning Phase" and "Coming Soon" — The System Is Built | `README.md:3,76` |
| DOC-002 | High | Three Large Implementation Plans Describe Unstarted Work That Is Already Done | `OIDC_IMPLEMENTATION.md`, `MULTI_TENANT_IMPLEMENTATION.md`, `FRONTEND_AUTH_PLAN.md` |
| DOC-003 | High | `features.json` Describes V1 Architecture — Agent Context Is Factually Wrong | `features.json` |
| DOC-004 | High | `CLAUDE.md` Gives No Project-Specific Guidance For the AI's Primary Development Role | `docs/contributing/CLAUDE.md` |
| DOC-005 | Medium | Frontend README Is a Vite Template — Not Project Documentation | `painchain/frontend/README.md` |
| DOC-006 | Medium | No Operational Runbooks — Common Tasks Have No Documented Procedure | `docs/contributing/` |
| DOC-007 | Medium | `.env.example` Is Incomplete — Missing Variables Used by the Application | `.env.example` |
