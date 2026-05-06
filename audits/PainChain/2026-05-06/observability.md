# Observability - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-observability
**Auditor:** AnchorStack

## Summary

PainChain has no production observability. There are no external monitoring tools, no error tracking, no metrics collection, no uptime checks, no dashboards, and no alerts. The only telemetry is NestJS's built-in `Logger` (unstructured text to stdout) used selectively in the auth subsystem, mixed with raw `console.*` calls scattered across the backend, connectors, and frontend. Connector failures (a polling error against GitHub, a missed backend POST, a rate-limit hit) produce console output that disappears when the container is recycled, with no aggregation and no alert. Failed login attempts are not logged at all. The timeline query logs response time but uses `console.log` rather than the NestJS logger, making it unsearchable in any log management tool. The system's core product value is a historical event timeline — but there is no way to know when that timeline stops receiving events, when it is returning incorrect data, or when it has become unavailable, without directly observing the UI.

## Observability Map

**Observability posture:** Zero observability — no external tools, no structured logging, no error tracking, no uptime monitoring, no alerts.
**Primary telemetry tools:** None. NestJS `Logger` (stdout only), `console.*` calls throughout.
**Logging posture:** Ad hoc — mix of NestJS `Logger` (some services) and raw `console.log`/`console.error` (backend, all connectors, frontend). No structured JSON, no correlation IDs, no log destination beyond stdout.
**Alerting posture:** No alerts. No channels, thresholds, or owners configured.
**Reliability targets:** None documented. No SLO, SLA, status page, or uptime commitment.
**Highest-risk blind spot:** Connector polling silently stops delivering events (rate limit, auth failure, backend unreachable) — the user sees a stale timeline with no indication of the problem.

### Tooling Inventory

| Tool/service | Category | Used for | Production evidence | Alerting evidence |
|--------------|----------|----------|---------------------|-------------------|
| NestJS `Logger` | Application logging | Auth controller/service, OIDC service, events service (partially) | Source code — not externally routed | No |
| `console.*` | Debug output | All connectors, PrismaService, main.ts, timeline.service, events.service debug blocks | Source code — stdout only | No |
| None | Error tracking | — | — | — |
| None | Metrics/APM | — | — | — |
| None | Uptime/health checks | — | — | — |
| None | Log aggregation | — | — | — |
| None | Alerting/paging | — | — | — |

### Logging And Correlation

| Surface | Logger/schema | Required fields | Destination/search | Sensitive-data risk |
|---------|---------------|-----------------|--------------------|---------------------|
| NestJS backend (auth) | NestJS `Logger` — unstructured text | Context class name only | stdout (container log) | User email logged on register, OIDC login, role change, remove — medium PII risk |
| NestJS backend (events) | Mixed — `Logger` + 7 `console.error` debug blocks | None | stdout (container log) | Prisma error meta (field names, constraint names) |
| NestJS backend (timeline) | `console.log` | Duration, event count, filter values | stdout (container log) | Filter values may include tenant-specific data |
| NestJS backend (database) | `console.log` | None (connection status only) | stdout | None |
| NestJS backend (main.ts) | `console.log` | Port, env | stdout | None |
| GitHub connector | `console.*` — unstructured | None | stdout (container log) | Logs integration names, repo names, event counts, error details |
| GitLab connector | `console.*` | None | stdout (container log) | Same pattern |
| Kubernetes connector | `console.*` | None | stdout | Same pattern |
| Frontend (browser) | `console.error` | None | Browser devtools only | Error messages from API failures |

### Metrics, Traces, And Dashboards

| Signal | Coverage | Tool/source | Gap |
|--------|----------|-------------|-----|
| API request latency | Missing | None | No HTTP request latency measurement or histogram |
| API error rate | Missing | None | No error rate metric or tracking |
| Event ingestion rate | Missing | None | No events-per-minute, connector health, or deduplication rate signal |
| Timeline query duration | Partial | `console.log` in timeline.service.ts:82 | Not searchable; disappears on container restart |
| Connector poll success/failure | Missing | None | Rate limit hits, auth failures, backend unreachability are logged to stdout and lost |
| Database connection health | Partial | `console.log` at startup | Only logged once at startup; no ongoing health signal |
| Session count / active users | Missing | None | No business health signal |
| Request volume | Missing | None | No traffic metric |

### Alerts And Ownership

| Alert/monitor | Condition | Route/owner | Tested? |
|---------------|-----------|-------------|---------|
| None configured | — | — | — |

### SLIs, SLOs, SLAs, And Runbooks

| Artifact | Target/commitment | Measurement source | Evidence |
|----------|-------------------|--------------------|----------|
| SLO | None documented | None | Not found |
| SLA | None documented | None | Not found |
| Status page | None | None | Not found |
| Health endpoint | None | `GET /api/connectors/types` used as K8s probe (not a health check) | `deprecated/helm/templates/deployments.yaml` |
| Runbook | None | — | Not found |
| Postmortem | None | — | Not found |

## Findings

### No Error Tracking — Backend Exceptions Silently Swallowed or Written to Ephemeral Stdout

**Severity:** High
**Category:** Error Visibility
**Location:** `painchain/backend/src/`, `painchain/frontend/src/`

No error tracking service (Sentry, Bugsnag, Rollbar, or equivalent) is configured for either the backend or frontend. Unhandled exceptions in the NestJS backend are written to stdout and lost when the container restarts. Frontend API errors are written to `console.error` and visible only in the user's browser devtools. The frontend data-fetch hooks (`useEvents.ts:45`, `useIntegrations.ts:27`, `useTeams.ts:27`, `useProjects.ts:23`) all catch errors and log them to the console without any user feedback beyond undefined state.

For a product that aggregates incident-investigation data, the irony is acute: a failed timeline query, a broken integration, or a crash in the auth flow generates no alert and no trace. The team learns about production failures only when a user reports them.

**Recommendation:** Install Sentry with the NestJS SDK (`@sentry/nestjs`) and the browser React SDK (`@sentry/react`). Instrument the NestJS bootstrap with `Sentry.init()` and add `SentryModule.forRoot()` to `AppModule`. Add the Sentry React ErrorBoundary around the app root. Configure environment and release tags. This can be done in under an hour and immediately gives stack traces for every production exception.

---

### No Uptime Monitoring or Health Endpoint — Downtime Is Invisible

**Severity:** High
**Category:** Availability / Incident Detection
**Location:** `painchain/backend/src/main.ts`

The application has no `/health` or `/api/health` endpoint. The Kubernetes liveness/readiness probe in the deprecated Helm chart uses `GET /api/connectors/types` — an application data endpoint, not a health check. There is no external uptime monitor (UptimeRobot, Better Stack, Checkly, or equivalent). If the application crashes, the database becomes unavailable, or the container exits, no alert fires. The `restart: unless-stopped` in Docker Compose will restart the container, but there is no notification that the restart happened or that the application was unavailable.

**Recommendation:** Add a `GET /api/health` endpoint using `@nestjs/terminus` that checks the database connection (Prisma `$queryRaw('SELECT 1')`) and returns `{ status: 'ok', db: 'ok', uptime: process.uptime() }`. Register a free UptimeRobot or Better Stack monitor against the health endpoint. This gives a Slack/email ping within 1 minute of downtime. Tag the health endpoint with `@Public()` (appropriate — it has no sensitive data) so it does not require authentication.

---

### Connector Failures Are Silent — Event Ingestion Can Stop Without Any Alert

**Severity:** High
**Category:** Job/Worker Monitoring / Reliability
**Location:** `connectors/github/src/github-poller.ts:49,77`, `connectors/gitlab/src/`, `connectors/kubernetes/src/`

Each connector runs a `setInterval` poll loop. When the poll fails (GitHub rate limit, invalid token, backend unreachable), it logs to `console.error` and continues to the next interval. There is no heartbeat, no dead-letter mechanism, no alert, and no metric counting consecutive poll failures. The event timeline — PainChain's core product — can stop updating entirely because a connector silently fails, and neither the application nor the user is notified.

Specific failure modes that are currently invisible:
- GitHub API rate limit exceeded: logged to console, no alert, poll silently yields zero events
- Backend unreachable (container down): each POST fails with a network error, logged to console
- Invalid/revoked API token: `401` logged, no alert, integration silently stops
- Consecutive failures persist indefinitely — the connector restarts are invisible

**Recommendation:** Implement a consecutive-failure counter in each connector. After N consecutive failures (e.g., 3), write a distinctive log line at `console.error` level (e.g., `CONNECTOR_FATAL`) that can be detected by a log alert or monitored via a heartbeat service. In the backend, expose a connector health endpoint (`GET /api/connectors/health`) that returns the last sync time for each integration — when a connector stops posting, the `lastSyncAt` staleness is observable. Use Cronitor or Better Stack Heartbeat (both have free tiers) as a dead-man's-switch that the connector pings on each successful poll cycle.

---

### Logging Is Unstructured, Inconsistent, and Uses Mixed Mechanisms

**Severity:** High
**Category:** Log Quality / Searchability
**Location:** `painchain/backend/src/`, `connectors/`

The backend mixes three logging mechanisms: NestJS `Logger` (structured by class name), raw `console.log`, and raw `console.error`. The connectors use only `console.*`. There is no log format standard, no correlation IDs, no request IDs, no tenant IDs, no release tags, and no log level configuration. Logs go to stdout in a container without any log aggregation destination (no Loki, CloudWatch, Axiom, Logtail, or Datadog).

Specific problems:
- `timeline.service.ts:82` logs query timing with `console.log` — not reachable via NestJS log level filtering
- `events.service.ts` mixes `this.logger` (for deduplication results) with 7 `console.error` debug blocks (for raw Prisma error meta) in the same method
- `prisma.service.ts` uses `console.log('✓ Database connected')` at startup — not searchable
- No HTTP request log: method, path, status, duration are not logged for any request
- Connector log lines use emoji delimiters (`📡`, `❌`, `✓`) that improve readability in a terminal but break log parsers and structured query tools

**Recommendation:** Standardize on NestJS `Logger` (or Pino via `nestjs-pino`) throughout the backend. Remove all `console.*` calls and replace with the appropriate `this.logger.log/warn/error` method. Add a NestJS middleware that logs `{method, path, statusCode, durationMs, requestId}` for every request. In connectors, replace `console.*` with a minimal structured logger (e.g., `pino`) so that log lines can be parsed and searched. This is foundational to using any log management tool.

---

### Failed Login Attempts Are Not Logged — Brute Force Is Invisible

**Severity:** Medium
**Category:** Security Observability / Audit Log
**Location:** `painchain/backend/src/auth/auth.service.ts:49-74`

`validateUserCredentials()` returns `null` for an invalid email or wrong password without logging either event. The `LocalStrategy` throws `UnauthorizedException` which NestJS converts to an HTTP 401, but no log line is written identifying the attempt, the email used, or the IP address. With no rate limiting on the login endpoint (raised in the security audit), a brute-force attack against any user account would generate zero visible signal in the logs.

Similarly, `JWT` validation failures (expired token, invalid signature, revoked session) throw `UnauthorizedException` without structured log output that identifies the failure type, the user, or the request context.

**Recommendation:** Log failed authentication attempts at `warn` level: `this.logger.warn('Login failed: invalid credentials', { email, ip })`. Log session validation failures at `debug` or `warn` level. These are security-relevant events and should be auditable. When a log management tool is added, configure an alert on repeated login failures from a single IP.

---

### No Request/Correlation IDs — Incidents Cannot Be Traced Across Services

**Severity:** Medium
**Category:** Log Correlation / Tracing
**Location:** `painchain/backend/src/main.ts`, all controllers

No request ID or correlation ID is generated or propagated. When a user reports a failed timeline query or a broken integration, there is no way to find the specific request in the logs (if logs existed) because requests are not identified. In a multi-container environment (backend + 3 connector containers), a single user action (e.g., "events stopped appearing") involves the connector posting to the backend, the backend deduplicating, and the frontend polling — and no trace connects these steps.

**Recommendation:** Add a NestJS middleware that generates a UUID request ID and attaches it to `AsyncLocalStorage` (or use `nestjs-cls`). Include `requestId` in all log lines. Return `X-Request-ID` in responses so the frontend can log it alongside API errors. This is the minimum correlation needed for incident diagnosis.

---

## Score

**Section score:** 1 / 10

The observability posture is effectively zero. There is no error tracking, no uptime monitoring, no alerts, no metrics, no dashboards, no health endpoint, no log aggregation, and no SLO/SLA documentation. The only telemetry is unstructured stdout from NestJS's built-in logger (used in some services) and raw `console.*` calls in others. In a self-hosted product where the team does not own the user's runtime, minimum viable observability — error tracking, a health endpoint, connector heartbeat, and log standardization — is achievable in hours and is critical for supporting production users who report "the timeline stopped updating." Without it, every incident requires direct container access to diagnose.

## Recommendations Summary

- [ ] Install Sentry with `@sentry/nestjs` (backend) and `@sentry/react` (frontend); configure environment/release tags — gives immediate exception visibility for all production failures
- [ ] Add `GET /api/health` endpoint using `@nestjs/terminus` with a DB ping, then register a free UptimeRobot monitor against it — gives 1-minute downtime detection
- [ ] Add a connector heartbeat: ping a dead-man's-switch URL (Cronitor, Better Stack) on each successful poll cycle; alert on missed heartbeats — closes the invisible-connector-failure gap
- [ ] Standardize all backend logging on NestJS `Logger`; remove `console.*` calls; add HTTP request middleware logging `{method, path, status, durationMs, requestId}`
- [ ] Log failed login attempts at `warn` level with email and IP for security auditability
