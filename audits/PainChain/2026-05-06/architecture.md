# Architecture - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-architecture
**Auditor:** AnchorStack

## Summary

PainChain v2 is a distributed polling architecture that aggregates change events from GitHub, GitLab, and Kubernetes into a single timeline for incident investigation. The core design is sound: independent connector containers push events to a central NestJS+PostgreSQL backend, which serves a co-deployed React SPA. The multi-tenant auth and session system is well-designed.

The architecture has three structural risks that prevent it from being production-safe today. First, the event ingestion path between connectors and the backend is entirely unqueued synchronous HTTP with no retry — events are silently dropped when the backend is unavailable. Second, all data endpoints (events, integrations, teams, timeline) are marked `@Public()`, collapsing the auth boundary between user-facing and connector-facing surfaces into a single unprotected API. Third, `prisma db push` is the production schema migration command, which can silently destroy data on schema changes. These three issues together mean the system cannot durably ingest events, protect tenant data, or safely evolve its schema.

## Architectural Requirements

**Business/product forces:** Reliable event aggregation for incident investigation. The primary value is a complete and durable change timeline. Missed events (dropped during connector-to-backend sync) directly degrade the product's core purpose.
**Critical journeys:** (1) Connector polling and event ingestion; (2) User login and multi-tenant session; (3) Timeline query filtered by connector, project, tag, and time range.
**Scale assumption:** Unknown production scale. Designed for small-to-medium engineering teams (~10–100 users, ~3–10 integrations, ~100–10k events/day). No rate limiting or pagination controls that would suggest large-scale design.
**Latency sensitivity:** Timeline queries must be fast (SRE incident response). Event ingestion is batch/background — latency-tolerant but durability-critical.
**Durability requirements:** Events must not be lost. Connector polling generates the only copy of change history. There is no replay mechanism.
**Compliance/security forces:** Multi-tenant SaaS: tenant data isolation is a hard requirement. API tokens (GitHub PATs, GitLab tokens) stored in the database.
**Architectural style:** Distributed services — backend+frontend monolith + independent connector microservices. Appropriate for the connector independence principle, but connector-to-backend contract is under-specified.

**Assumptions and unknowns:**
- No production traffic data. Scale estimates are inferred from feature scope.
- Whether connectors are expected to be stateless (no cursor/bookmark for polling) is unclear; current code always fetches the last 30 events regardless of what was already stored.
- Whether the SaaS tier (webhooks, managed infrastructure) is planned near-term or distant-future.
- No monitoring or observability infrastructure observed — unknown whether events are actually reaching the backend in production.

## System Map

**Architecture type:** Distributed services (backend monolith + independent connector services)
**Deployment shape:** One Docker image (`painchain/`) bundles both NestJS backend and React frontend, co-deployed at port 8000. PostgreSQL runs as a separate container. Three connector containers (GitHub, GitLab, Kubernetes) run independently, polling their respective sources and pushing events via HTTP to the backend API. All five containers are orchestrated with docker-compose for local deployment; a Helm chart is referenced for Kubernetes but not present in v2.

### Architecture Diagram

```mermaid
flowchart LR
  User[Browser / SPA] -->|HTTP REST| BE[NestJS Backend :8000]
  BE -->|Static files| User

  GH[GitHub Connector\nNode/setInterval] -->|POST /api/events\nGET /api/integrations| BE
  GL[GitLab Connector\nNode/setInterval] -->|POST /api/events\nGET /api/integrations| BE
  K8S[Kubernetes Connector\nNode/watch| ] -->|POST /api/events\nGET /api/integrations| BE

  GH -->|REST API| GitHub[GitHub API]
  GL -->|REST API| GitLab[GitLab API]
  K8S -->|Kubernetes watch| K8SCluster[K8s Cluster]

  BE -->|Prisma ORM| PG[(PostgreSQL 16)]

  style GH fill:#f9a,stroke:#c00
  style GL fill:#f9a,stroke:#c00
  style K8S fill:#f9a,stroke:#c00
```

*Red: connector-to-backend calls are synchronous HTTP with no queue or retry mechanism.*

### Runtime Units

| Unit | Runtime/deploy target | Responsibility | Evidence |
|------|-----------------------|----------------|----------|
| NestJS Backend | Node 24, Docker | Auth, event storage, timeline query, integration registry | `painchain/backend/src/main.ts` |
| React Frontend | Vite SPA, served by backend | Timeline UI, integrations page, auth UI | `painchain/frontend/src/` |
| GitHub Connector | Node 24, Docker, setInterval | Poll GitHub API, push events to backend | `connectors/github/src/github-poller.ts` |
| GitLab Connector | Node 24, Docker, setInterval | Poll GitLab API, push events to backend | `connectors/gitlab/src/` |
| Kubernetes Connector | Node 24, Docker, K8s watch | Watch K8s resources, push events to backend | `connectors/kubernetes/src/` |
| PostgreSQL 16 | Docker volume | All persistent state | `docker-compose.yml` |

### Data Stores And State

| Store | Type | Source of truth for | Evidence |
|-------|------|---------------------|----------|
| PostgreSQL (Prisma) | Relational | Events, users, sessions, integrations, tenants, teams, invitations, OIDC providers | `painchain/backend/prisma/schema.prisma` |
| `localStorage` (browser) | Client key-value | JWT auth token (`painchain_auth_token`) | `painchain/frontend/src/api/client.ts:19` |

### External Services

| Service | Used for | Call path | Sync/async |
|---------|----------|-----------|------------|
| GitHub REST API | Fetching repo events, workflow runs, PR files | `connectors/github/src/github-poller.ts` via `@octokit/rest` | Sync (blocking in poll loop) |
| GitLab REST API | Fetching MRs, pipelines, releases | `connectors/gitlab/src/` | Sync (blocking in poll loop) |
| Kubernetes API | Watching cluster resource changes | `connectors/kubernetes/src/k8s-watcher.ts` | Async watch stream |
| OIDC providers (Google, Okta, etc.) | SSO authentication | `painchain/backend/src/auth/services/oidc.service.ts` | Sync redirect flow |

### API And Entry Surface

| Surface | Count/location | Notes |
|---------|----------------|-------|
| Auth routes | 15+ endpoints in `AuthController` | JWT + OIDC + invitations + session management |
| Events API | 3 endpoints (`GET`, `POST`, `GET /:id`) | `@Public()` — unauthenticated |
| Integrations API | 5 endpoints (CRUD + type registry) | `@Public()` — unauthenticated |
| Timeline API | 1 `GET` endpoint | `@Public()` — unauthenticated |
| Projects API | `GET` endpoint(s) | `@Public()` — unauthenticated |
| Teams API | CRUD endpoints | `@Public()` — unauthenticated |

### Async And Background Work

| Mechanism | Location | Work handled | Notes |
|-----------|----------|--------------|-------|
| `setInterval` (connector) | `connectors/github/src/github-poller.ts:25` | GitHub API polling every N seconds | No overlap guard; overlapping polls possible if poll takes > interval |
| `setInterval` (connector) | `connectors/gitlab/src/` | GitLab API polling | Same pattern |
| K8s Watch stream | `connectors/kubernetes/src/k8s-watcher.ts` | Kubernetes resource change events | Event-driven, not polling |
| Session cleanup | `painchain/backend/src/auth/services/session.service.ts:104` | Expired session deletion | Method exists but no scheduler calls it — never runs |

### Key Flows

1. **Event ingestion**: Connector `setInterval` fires → fetch integrations from `/api/integrations` → call external API → POST each event to `/api/events` → Prisma upsert with deduplication on `(integrationId, externalId)`
2. **Auth login**: Browser POST `/api/auth/login` → `LocalStrategy` validates credentials → session created in DB → JWT returned with `jti` → stored in `localStorage`
3. **Authenticated request**: Browser → `Authorization: Bearer <jwt>` → `JwtStrategy.validate()` checks session in DB → `TenantGuard` sets `validatedTenantId` → controller executes
4. **Timeline query**: Browser GET `/api/timeline?...` → `TimelineService` queries events table → if tag filter: fetch all integrations → in-memory filter → query events by integration IDs

## Critical Flows

| Flow | Path | Execution model | State changed | Failure concern |
|------|------|-----------------|---------------|-----------------|
| Auth/session | Browser → POST `/api/auth/login` → DB session create → JWT | Sync | `Session` + `User.lastLoginAt` | Session table grows unbounded (no cleanup job wired) |
| Event ingestion | Connector → external API → POST `/api/events` → Prisma upsert | Sync HTTP chain | `Event`, `Integration.lastSync` | No queue; backend unavailable = events silently lost. No retry. |
| OIDC login | Browser → GET `/api/auth/oidc/:id` → redirect → callback → DB upsert → JWT in URL redirect | Sync redirect chain | `User`, `OIDCAccount`, `Session` | JWT token passed in URL query param (logged by servers/browsers) |
| Timeline query | Browser → GET `/api/timeline` → Prisma query (+ in-memory tag filter) | Sync | None (read-only) | Tag filter loads all integrations into memory; no pagination on result |
| Schema migration | `docker-compose up` runs `npx prisma db push` | Synchronous, destructive | All tables | `db push` can silently drop/alter columns; no migration history |
| Connector registration | Connector startup → POST `/api/integrations/types/register` | Sync, one-shot | `ConnectorType` table | No auth; any process can register/overwrite connector metadata |

## Architectural Decisions And Tradeoffs

| Decision | Current choice | Why it may fit | Tradeoff/risk | Evidence |
|----------|----------------|----------------|---------------|----------|
| Runtime style | Backend+frontend colocated in one Docker image | Simpler ops for self-hosted; single port | Couples frontend and backend deployment; cannot scale independently | `painchain/Dockerfile` |
| Connector isolation | Independent Docker containers, HTTP push | True separation; language-agnostic connectors possible | No auth between connectors and backend; no queue for reliability | `docker-compose.yml`, `connectors/*/src/backend-client.ts` |
| Event ingestion | Synchronous HTTP POST per event from connector | Simple, no queue infrastructure needed | Events are lost when backend is unavailable; no retry; no backpressure | `connectors/github/src/github-poller.ts:133` |
| Polling strategy | `setInterval` with fixed period | Simple to implement; no external deps | No cursor/bookmark; refetches same events on every cycle (deduplication happens at backend); poll overlap possible if cycle > interval | `connectors/github/src/github-poller.ts:25` |
| Deduplication | DB unique constraint on `(integrationId, externalId)` | Correct approach; idempotent from connector side | Complex error-catch code to handle P2002; debug logs left in production | `painchain/backend/src/events/events.service.ts` |
| Data ownership | Single PostgreSQL for all state | Simple; ACID; Prisma gives good DX | No read replica; no connection pooling observed; single point of failure | `painchain/backend/prisma/schema.prisma` |
| Schema migration | `prisma db push` in production container startup | Zero-config for development | Destructive on breaking schema changes; no rollback; no migration history | `docker-compose.yml:44` |
| Auth model | JWT + database-backed sessions + OIDC | Revocable sessions (good); OIDC extensible | Every authenticated request hits DB twice (session check + user load); session table never cleaned up | `painchain/backend/src/auth/strategies/jwt.strategy.ts` |
| API surface | Single API serves both users and connectors | Simple; no separate gateway needed | `@Public()` on data endpoints removes all tenant isolation for connector paths; any process can write to any tenant | `painchain/backend/src/events/events.controller.ts:26` |

## Scaling And Failure Analysis

**First likely scaling bottleneck:** The PostgreSQL database, specifically the session validation query. Every authenticated API request performs two sequential DB queries: `isSessionValid()` (session table lookup) + `findUnique(user)`. With no connection pooling (no PgBouncer, no Prisma connection pool config observed), concurrent users will exhaust connection slots before hitting any application-level limit. Additionally, the `Session` table grows without bound — the cleanup method `cleanupExpiredSessions()` exists but is never called by any scheduler.

**Most important reliability gap:** Event loss on backend downtime. Connectors post events synchronously and have no retry queue. If the backend restarts, is deploying, or is overloaded, the connector's HTTP POST fails, the error is caught and logged, and that poll cycle's events are gone. Since connectors re-fetch the last 30 events every cycle regardless, some events will reappear on the next poll — but events that fall outside the 30-item window (e.g., bursts of activity) are permanently lost. There is no durability guarantee.

**State consistency risk:** The tag-filtering implementation in `TimelineService` loads all integrations into Node.js memory and filters by `config.tags`. This is a read-inconsistency risk: if an integration is created or updated between when the integration list is loaded and when events are queried, results may be inconsistent. More practically, with no pagination on the timeline query result (only a soft cap of 2000 computed from time range), a wide time-range query can load thousands of events into memory.

**Operational ownership risk:** `prisma db push` is the production schema application command. This command compares the desired schema with the current database schema and applies the diff — including dropping columns or tables that are no longer in the schema. There are no migration files, so rollback means re-running `db push` with an older schema, which can itself be destructive. No one can safely apply a breaking schema change to a production database using this approach.

**Recommended architectural next move:** Replace synchronous event posting with a lightweight queue or at-minimum a retry buffer in the connector. Even a simple SQLite-backed local queue in each connector that retries failed POSTs would eliminate the event-loss risk without adding infrastructure. Simultaneously, migrate connectors from `@Public()` to a connector API key model — connectors register on startup with a shared secret and get a scoped token, which restores tenant isolation on event ingestion paths.

## Findings

### No Queue Between Connectors And Backend — Events Are Silently Lost

**Severity:** Critical
**Category:** Reliability / Event Durability
**Location:** `connectors/github/src/github-poller.ts:133`, `connectors/github/src/backend-client.ts:35`

When the connector's `postEvent()` call fails (backend restart, deployment, timeout), the error is caught and logged and the poll cycle continues. The event is gone. Because connectors fetch the last 30 events unconditionally on every poll, some events may reappear on the next cycle — but any burst of more than 30 events in a poll window, or any outage longer than one interval, produces permanent data loss with no alert.

**Recommendation:** Add a local retry buffer to each connector. The simplest form is a SQLite database (or even an in-memory queue with exponential backoff) that holds failed events and retries them before processing new ones. A more robust form is a shared queue (Redis Streams or a simple Postgres queue table) that the backend drains. The connector-to-backend contract already has idempotent `externalId` deduplication, so retries are safe.

---

### prisma db push Used as Production Migration Command

**Severity:** Critical
**Category:** Schema / Data Integrity
**Location:** `docker-compose.yml:44`

The production container startup command is `npx prisma db push && node dist/src/main.js`. `prisma db push` introspects the current schema diff and applies it directly — including dropping columns and tables that are no longer in the schema. There are no migration files, so there is no rollback path and no way to audit what schema changes were applied or when. A breaking schema change in development, accidentally applied in production, can silently destroy data.

**Recommendation:** Switch to `prisma migrate deploy` with versioned migration files generated by `prisma migrate dev`. Separate schema migration from container startup — run migrations as a pre-deploy step or init container, not inline with the application process. Keep `db push` for local development only.

---

### All Data Endpoints Unauthenticated — Connector and User APIs Share One Unprotected Surface

**Severity:** Critical
**Category:** Authentication / Tenant Isolation
**Location:** `painchain/backend/src/events/events.controller.ts:26`, `painchain/backend/src/integrations/integrations.controller.ts:39`, `painchain/backend/src/teams/teams.controller.ts:17`, `painchain/backend/src/api/timeline.controller.ts:5`, `painchain/backend/src/api/projects.controller.ts:5`

Every API controller except `AuthController` is marked `@Public()` with the comment "Temporary: Allow unauthenticated access during migration." This means any process with network access to port 8000 can read all events, all integrations (including their stored API tokens in `config`), all teams, and the full timeline — for any tenant — without any authentication. The multi-tenant model in the schema is entirely bypassed.

**Recommendation:** (1) Introduce a connector API key model: connectors authenticate with a shared secret at startup and receive a scoped token. (2) Remove `@Public()` from all data controllers. (3) Use `validatedTenantId` (set by `TenantGuard`) in all controller methods instead of reading the `x-tenant-id` header directly.

---

### Every Authenticated Request Hits the Database Twice With No Session Caching

**Severity:** High
**Category:** Scalability / Performance
**Location:** `painchain/backend/src/auth/strategies/jwt.strategy.ts:34-56`

`JwtStrategy.validate()` runs on every authenticated request. It performs two sequential database queries: `sessionService.isSessionValid()` (selects from `sessions` table + updates `lastActivityAt`) then `prisma.user.findUnique()` (loads user + tenant). The `lastActivityAt` update on every request generates a write for every API call. At modest concurrency (100 req/s), this is 200 DB queries/second plus 100 writes/second for session tracking alone, with no caching layer.

**Recommendation:** Cache the session validity check with a short TTL (e.g., 60-second in-memory or Redis cache keyed by `jti`). Skip the `lastActivityAt` write on every request — update it periodically instead (e.g., once per minute per session). For user data, embed stable claims (role, tenantId) in the JWT payload and skip the user DB query entirely on most requests, only re-loading when the JWT is about to be refreshed.

---

### Session Cleanup Method Exists But Is Never Called

**Severity:** High
**Category:** Operational Risk / Database Growth
**Location:** `painchain/backend/src/auth/services/session.service.ts:104`

`SessionService.cleanupExpiredSessions()` is implemented but never scheduled. Every login creates a `Session` row with a 7-day expiry. Without cleanup, the sessions table grows indefinitely. OIDC logins that retry or fail may generate orphaned sessions. At scale, this table becomes a performance liability for the `isSessionValid` query (which filters by `token` and checks `expiresAt`).

**Recommendation:** Add a NestJS scheduled task using `@nestjs/schedule` that calls `cleanupExpiredSessions()` daily. Alternatively, add a database-level TTL policy or a Postgres cron job via `pg_cron`.

---

### Connector Polling Has No Cursor — Duplicate Processing On Every Cycle

**Severity:** High
**Category:** Architecture / Efficiency
**Location:** `connectors/github/src/github-poller.ts:96`

The GitHub poller fetches `per_page: 30` events on every cycle without a cursor (no `since` parameter, no `etag`/`If-None-Match`). This means every poll cycle re-fetches and re-processes up to 30 events per repo, relying on the backend's deduplication constraint to discard them. In a repo with frequent activity, only the last 30 events are ever checked — events older than the 30-event window are permanently missed even if they occurred since the last poll. The `lastSync` timestamp stored in `Integration` is not used as a filter.

**Recommendation:** Use GitHub's `since` parameter (`listRepoEvents` doesn't support it, but `listEvents` for pushes, PRs, etc. does). Use the `ETag` and `If-None-Match` headers for conditional polling when the event list hasn't changed. Use `Integration.lastSync` as the polling cursor to avoid reprocessing stale events.

---

### Tag Filtering Loads All Integrations Into Memory

**Severity:** Medium
**Category:** Performance / Architecture
**Location:** `painchain/backend/src/api/timeline.service.ts:23-47`

When a tag filter is applied on the timeline, `TimelineService` executes `integration.findMany()` with no `where` clause (or only a connector type filter), loads all integrations into Node.js memory, and filters by `config.tags` in application code. At 100 integrations this is inconsequential; at 10,000 it becomes a serial bottleneck on every tag-filtered timeline request.

**Recommendation:** Move tags out of `Integration.config` (opaque JSON) into a typed, indexed column or a dedicated `IntegrationTag` join table. This enables `WHERE` filtering to happen in PostgreSQL with an index rather than in application memory.

---

### Connector Metadata Registration Has No Auth and Allows Overwrite

**Severity:** Medium
**Category:** Security / Integrity
**Location:** `connectors/github/src/register-metadata.ts:10`, `painchain/backend/src/integrations/integration-types.controller.ts`

Connector registration (`POST /api/integrations/types/register`) is unauthenticated. Any process can call this endpoint and overwrite the `ConnectorType` record for `github`, `gitlab`, or `kubernetes` — including their `configSchema`. This could be used to inject a malicious config schema that steals user-submitted API tokens through the UI form.

**Recommendation:** Add connector authentication to the registration endpoint. A simple shared secret (environment variable) passed as `Authorization: Bearer <connector-secret>` would close this attack surface. Connectors that fail to authenticate should not be able to register or update connector type metadata.

---

## Score

**Section score:** 4 / 10

The fundamental architecture pattern — independent connector containers pushing to a central API — is appropriate and extensible. The multi-tenant schema and auth design are thoughtful. The system earns its score back because of three structural gaps that together prevent production-safe operation: silent event loss (no queue), destructive schema migration (`db push`), and complete auth bypass on all data endpoints. The auth system was built carefully and then bypassed. The score reflects the gap between design intent and current implementation.

## Recommendations Summary

- [ ] Replace synchronous connector-to-backend HTTP with a retry-buffered queue (even local SQLite in each connector eliminates silent event loss)
- [ ] Replace `prisma db push` with `prisma migrate deploy` and versioned migration files
- [ ] Remove `@Public()` from all data controllers; add connector API key authentication for event ingestion paths
- [ ] Cache JWT session validation (60s TTL) to eliminate two DB queries per request
- [ ] Schedule `cleanupExpiredSessions()` via `@nestjs/schedule` to prevent session table growth
