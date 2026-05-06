# Security - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-security
**Auditor:** AnchorStack

## Summary

PainChain cannot safely protect its users, tenants, credentials, or stored API tokens against realistic abuse in its current state. The application has a carefully designed auth system that is then structurally bypassed: five of six API controllers are `@Public()`, meaning the event ingestion, integration management (which contains API tokens), team management, and timeline endpoints are entirely unauthenticated. Real secrets — a database password and JWT signing key — are committed to the git repository and tracked. `express-rate-limit` is in the dependency list but never wired up. There is no SAST, no dependency scanning, no pre-commit hooks, no container scanning, and no security headers. All containers run as root. These are not configuration gaps — they are structural security failures that must be addressed before exposing this system to any external network.

## Security Map

**Primary security model:** Custom JWT + database-backed sessions. Auth is well-designed (bcrypt-12 passwords, OIDC state HMAC, session revocation, role-based access). The JWT guard and TenantGuard are globally registered — but bypassed by `@Public()` on all non-auth controllers.
**Protected assets:** Connector API tokens (GitHub PATs, GitLab tokens) in `Integration.config`; user PII (email, names) in `users`; OIDC client secrets in `oidc_providers`; JWT signing secret; DB password.
**Trust boundary summary:** Auth boundary exists on paper but is disabled on all data endpoints. No RLS. No server-to-server auth for connectors. Connectors are trusted implicitly (any HTTP caller can ingest events or read integrations including their API tokens).
**Highest-risk flow:** `GET /api/integrations` — unauthenticated, returns all integrations including their `config` JSON which contains live API tokens for GitHub, GitLab, and Kubernetes. Any process with network access to port 8000 can read these tokens.
**Known unknowns:** Whether the DB password or JWT secret in `.env` have been rotated since being committed. Whether any external access to port 8000 exists in any deployment.

### Actors And Permissions

| Actor | Intended access | Enforcement evidence | Risk |
|-------|-----------------|----------------------|------|
| Anonymous (unauthenticated) | Login/register/OIDC/invite-lookup only | `@Public()` on auth routes | 5 additional controllers are `@Public()` — full data access is unintentionally open |
| Authenticated user | Tenant-scoped data | JWT guard + TenantGuard | Only enforced on auth routes; all data endpoints bypass |
| Owner/Admin role | Team management, invitations, role changes | Application-level checks in `AuthService` | Correct on auth paths; irrelevant on data paths which have no auth |
| Connector (Docker container) | POST events, GET integrations | None — `@Public()` endpoints | Any HTTP client is trusted as a connector; no connector identity |
| Anonymous HTTP caller | All data endpoints | None | Can read API tokens, write events for any tenant, modify integrations |

### Entry Points And Trust Boundaries

| Surface | Location | Auth required | Boundary concern |
|---------|----------|---------------|------------------|
| `POST /api/auth/login` | `auth.controller.ts:61` | No (public) | Rate limiting absent; brute-force possible |
| `POST /api/auth/register` | `auth.controller.ts:79` | No (public) | Open registration enabled; no invite required by default |
| `GET /api/auth/callback` | `auth.controller.ts:115` | No (public) | JWT passed in URL query param — logged by servers |
| `GET /api/events` | `events.controller.ts` | No (`@Public()`) | Returns all events for any tenant |
| `POST /api/events` | `events.controller.ts` | No (`@Public()`) | Any caller can inject events for any tenant |
| `GET /api/integrations` | `integrations.controller.ts` | No (`@Public()`) | Returns all integrations including API tokens |
| `POST /api/integrations` | `integrations.controller.ts` | No (`@Public()`) | Any caller can create integrations with API tokens |
| `PUT /api/integrations/:id` | `integrations.controller.ts` | No (`@Public()`) | Any caller can modify any integration |
| `DELETE /api/integrations/:id` | `integrations.controller.ts` | No (`@Public()`) | Any caller can delete any integration |
| `GET /api/timeline` | `timeline.controller.ts` | No (`@Public()`) | Returns all events for any tenant |
| `GET /api/teams`, `/api/projects` | `teams.controller.ts`, `projects.controller.ts` | No (`@Public()`) | All team and project data exposed |
| `POST /api/integrations/types/register` | `integration-types.controller.ts` | No (`@Public()`) | Any caller can overwrite connector metadata including configSchema |

### Sensitive Data And Secrets

| Asset/secret class | Location/evidence | Exposure concern | Rotation/handling |
|--------------------|-------------------|------------------|-------------------|
| DB password (`CrazyCowardClowns11`) | `.env` — tracked in git | Git history; any clone | No rotation evidence |
| JWT signing secret (base64) | `.env` — tracked in git | Git history; any clone | No rotation evidence |
| GitHub/GitLab/K8s API tokens | `Integration.config` JSON column | DB read or unauthenticated `/api/integrations` endpoint | Plaintext; no encryption |
| OIDC client secrets | `OIDCProvider.clientSecret` DB column | DB read | Plaintext; no encryption |
| `JWT_SECRET` reused as OIDC state encryption key | `oidc.service.ts:36` | Compromising JWT secret compromises OIDC state | Single secret for two purposes |

### Proof Checks

| Check | Result | Evidence |
|-------|--------|----------|
| Two-account IDOR | Not run — moot | All data endpoints are unauthenticated; IDOR is not the binding constraint |
| RLS/security rules | Fail — None | No database-level RLS; application-level checks bypassed by `@Public()` |
| Secret scan | Fail | `.env` tracked in git with real DB password and JWT secret; `git ls-files .env` → tracked |
| Vulnerability scanning | Fail — None | No SAST, no SCA/dependency scan, no secret detection in CI, no container scanning |
| Pre-commit security hooks | Fail — None | No husky, no pre-commit, no gitleaks/trufflehog hooks configured |
| Webhook signature/replay | Not applicable | No incoming webhooks; connectors push via HTTP |
| Server-side validation | Fail — Partial | `ValidationPipe` not registered; DTO decorators inert; input accepted without validation |
| LLM guardrails | Not applicable | No LLM/AI usage in application |
| SOC2 readiness evidence | Not ready | No audit logs, no access control evidence, no encryption at rest, no vulnerability management, no change management gates |

## Findings

### .env With Real Credentials Committed to and Tracked by Git

**Severity:** Critical
**Category:** Secrets Management
**Location:** `.env` (tracked: confirmed via `git ls-files .env`)

The `.env` file is tracked by git and contains a live database password (`CrazyCowardClowns11`) and a base64-encoded JWT signing secret. Anyone with access to the repository — including any future contributor or CI runner — has these credentials. The credentials were present at every clone and every `git pull` since the file was first committed. The `.gitignore` lists `.env` but the file was tracked before or despite this rule.

**Recommendation:** (1) Rotate the DB password and JWT secret immediately — treat them as compromised. (2) Remove `.env` from git history using `git filter-repo --path .env --invert-paths`. (3) Verify `.gitignore` is working: run `git check-ignore -v .env`. (4) Add a pre-commit hook (gitleaks or trufflehog) that blocks secrets from being committed.

---

### All Data API Endpoints Are Unauthenticated — Integration API Tokens Fully Exposed

**Severity:** Critical
**Category:** Broken Access Control / Secrets Exposure
**Location:** `painchain/backend/src/integrations/integrations.controller.ts:39`, `events.controller.ts:26`, `teams.controller.ts:17`, `api/timeline.controller.ts:5`, `api/projects.controller.ts:5`

Five controllers are decorated `@Public() // Temporary: Allow unauthenticated access during migration`. `GET /api/integrations` returns all integrations including the `config` JSON field containing GitHub Personal Access Tokens, GitLab tokens, and Kubernetes credentials — in plaintext — to any unauthenticated caller with network access to port 8000. Additionally, any caller can `POST /api/events` to inject fake events for any tenant, `PUT /api/integrations/:id` to modify any integration's config, or `DELETE /api/integrations/:id` to destroy integrations. There is no authentication, no rate limiting, and no IP restriction.

**Recommendation:** Remove `@Public()` from all data controllers immediately. Introduce a connector API key (shared secret, env var) for server-to-server event ingestion. User-facing data endpoints should require JWT auth via `validatedTenantId`. Remove API tokens from the `config` field in API responses — use a separate retrieval path with elevated authorization.

---

### No Rate Limiting on Auth Endpoints — Brute Force Possible

**Severity:** High
**Category:** Authentication Failures
**Location:** `painchain/backend/src/main.ts`, `painchain/backend/package.json:33`

`express-rate-limit@8.2.1` is listed as a dependency but is never imported or configured anywhere in the application code. `POST /api/auth/login` and `POST /api/auth/register` have no rate limiting. An attacker can make unlimited login attempts against any email address. With `ALLOW_REGISTRATION=true` (the current `.env` setting), an attacker can also create unlimited accounts.

**Recommendation:** Wire `express-rate-limit` to `app.use()` in `main.ts` with strict limits on auth routes (`/api/auth/login`, `/api/auth/register`) — e.g., 10 requests per 15 minutes per IP. Separately rate-limit the global API surface to prevent DoS via event ingestion.

---

### JWT Token Passed as URL Query Parameter on OIDC Callback

**Severity:** High
**Category:** Authentication / Token Exposure
**Location:** `painchain/backend/src/auth/auth.controller.ts:141`

After OIDC authentication, the server redirects to `${frontendUrl}?token=${authResponse.access_token}`. The JWT access token appears in:
- Server access logs (Apache/nginx/Node HTTP logs)
- Browser history
- Browser URL bar (visible to anyone looking at the screen)
- `Referer` headers in subsequent requests to third parties
- Browser extensions with access to the current URL

This is a well-known attack surface documented in OAuth 2.0 Security Best Current Practice (RFC 9700).

**Recommendation:** Replace URL token delivery with a short-lived one-time code approach: store a random code in the database (TTL: 30 seconds), redirect to `${frontendUrl}/auth/callback?code=<random>`, then have the frontend `POST` the code to `/api/auth/exchange-code` to receive the JWT in the response body. The token never appears in a URL.

---

### Open Registration Enabled With No Abuse Controls

**Severity:** High
**Category:** Authentication / Business Logic
**Location:** `.env:26` (`ALLOW_REGISTRATION=true`), `painchain/backend/src/auth/auth.service.ts:84`

With `ALLOW_REGISTRATION=true`, anyone can create a new organization and user account. Combined with the absent rate limiting, an attacker can: (1) create thousands of tenant accounts exhausting DB resources; (2) use the registration endpoint as a service for organizational spam. The registration flow also creates a new `Tenant` for each registration, making tenant proliferation trivially easy.

**Recommendation:** For production deployments, either disable open registration (`ALLOW_REGISTRATION=false`) and rely on invitation-only onboarding, or add domain allowlisting, email verification, and rate limiting before registration is considered safe for public exposure.

---

### All Docker Containers Run as Root

**Severity:** High
**Category:** Container Security
**Location:** `painchain/Dockerfile`, `connectors/github/Dockerfile`, `connectors/gitlab/Dockerfile`, `connectors/kubernetes/Dockerfile`

No Dockerfile in the project creates a non-root user or uses `USER <nonroot>`. All containers run as root (UID 0) by default. If an attacker achieves remote code execution in any container (e.g., via a dependency vulnerability), they have root access within the container and can potentially escape the container via known kernel vulnerabilities or mount exploits.

**Recommendation:** Add `RUN addgroup -S painchain && adduser -S painchain -G painchain` in the production stage of each Dockerfile, then `USER painchain` before the `CMD`. This is a standard Alpine Linux pattern with no operational cost.

---

### No Security Headers Configured

**Severity:** High
**Category:** Security Misconfiguration
**Location:** `painchain/backend/src/main.ts`

The NestJS backend has no security headers middleware. The response headers include no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`, or `Permissions-Policy`. The SPA frontend served by the backend inherits this gap. Additionally, `app.enableCors()` is called with no configuration, allowing any origin.

**Recommendation:** Install and configure `@nestjs/platform-express` with `helmet`: `import helmet from 'helmet'; app.use(helmet());`. Separately configure CORS: `app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000'] })`.

---

### JWT Signing Secret Reused as OIDC State Encryption Key

**Severity:** Medium
**Category:** Cryptographic Design
**Location:** `painchain/backend/src/auth/services/oidc.service.ts:36`

`this.stateSecret = this.configService.get('JWT_SECRET') || 'fallback-secret'`. The same secret used to sign JWT access tokens is also used to derive the AES-256 key for encrypting OIDC state parameters. Additionally, the fallback `'fallback-secret'` is used if `JWT_SECRET` is not set, making state encryption trivially breakable in misconfigured deployments. Reusing keys across different cryptographic purposes reduces key compromise isolation.

**Recommendation:** Introduce a separate `OIDC_STATE_SECRET` environment variable. Document it in `.env.example`. Remove the string literal fallback — throw an error at startup if neither secret is configured.

---

### No Vulnerability Scanning, SAST, or Dependency Scanning in CI

**Severity:** Medium
**Category:** Supply Chain / Vulnerability Management
**Location:** `.github/workflows/`

The four CI workflows (build-main, test, release, helm-test) contain no security gates: no `npm audit` check, no Dependabot configuration, no CodeQL or other SAST, no secret scanning (GitHub's native secret scanning is not confirmed enabled), no container image scanning (Trivy, Grype, etc.), and no pre-commit secret hooks. Dependencies include `@octokit/rest`, `axios`, `passport-jwt`, `bcrypt`, and `@prisma/client` — all widely used but unscanned.

**Recommendation:** Add `npm audit --audit-level=high` as a failing CI step for both backend and frontend. Enable GitHub Dependabot security alerts and automatic PRs. Enable GitHub's secret scanning and push protection. Add a Trivy image scan step to the build workflow. Add gitleaks as a pre-commit hook documented in the README.

---

### OIDC Provider URLs Fetched Without Validation — Potential SSRF

**Severity:** Medium
**Category:** Injection / SSRF
**Location:** `painchain/backend/src/auth/services/oidc.service.ts:72,106`

`tokenUrl` and `userinfoUrl` from the `OIDCProvider` record are fetched directly with `fetch(provider.tokenUrl, ...)` and `fetch(provider.userinfoUrl, ...)`. These URLs come from the database (originally from the `OIDC_PROVIDERS` env var), but no URL validation is performed. If an attacker could insert or modify a provider record (currently easy — no auth on connector registration), they could point these URLs at internal services (`http://169.254.169.254/`, `http://localhost:5432/`, etc.) to perform SSRF. The unauthenticated `POST /api/integrations/types/register` is the most realistic injection path.

**Recommendation:** Validate that `tokenUrl` and `userinfoUrl` use `https://` scheme and are not RFC 1918 / loopback / link-local addresses before making the fetch call. Implement an allowlist of trusted issuer domains when possible.

---

### `ValidationPipe` Not Registered — All Input Accepted Without DTO Validation

**Severity:** Medium
**Category:** Input Validation / Injection
**Location:** `painchain/backend/src/main.ts`

`class-validator` decorators (`@IsEmail`, `@IsString`, `@MinLength`) are defined on DTOs but `app.useGlobalPipes(new ValidationPipe())` is never called. Every request body is accepted without any validation. This means: oversized strings can be submitted to any field, invalid email formats are accepted as-is, and password length requirements are not enforced at the HTTP layer. While this doesn't directly enable injection (Prisma parameterizes queries), it enables log pollution, application-layer logic bypasses, and storage of malformed data.

**Recommendation:** Add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))` to `main.ts`. Add DTOs with validators to `EventsController` (currently uses an unvalidated inline interface) and `IntegrationsController` (currently passes raw `Prisma.IntegrationCreateInput` from the body).

---

### Session Table Grows Without Cleanup — Session Token Enumeration Risk

**Severity:** Low
**Category:** Session Management
**Location:** `painchain/backend/src/auth/services/session.service.ts:104`

The `cleanupExpiredSessions()` method exists but is never called. The session table accumulates rows forever. The `Session.token` column is a UUID (unpredictable), so enumeration is not a realistic attack path. However, a growing session table increases the blast radius of a DB read compromise (an attacker gets more historical session tokens) and degrades `isSessionValid()` query performance over time.

**Recommendation:** Schedule `cleanupExpiredSessions()` via `@nestjs/schedule`. A daily run is sufficient. Alternatively, add a Postgres `pg_cron` job or a TTL-based DELETE on the `sessions` table.

---

## Score

**Section score:** 2 / 10

There are four critical findings: committed secrets, all data endpoints unauthenticated (including the API token store), no rate limiting on auth despite the package being installed, and no security scanning of any kind. The OIDC auth design itself is solid — state parameter is encrypted with AES-256, nonce is random, timestamp expiry is enforced — but this sophistication is undermined by the surrounding gaps. The system exposes GitHub PATs, JWT secrets, and all event data to anonymous HTTP callers. Immediate remediation is required before any network exposure.

## Recommendations Summary

- [ ] Rotate DB password and JWT secret immediately; remove `.env` from git history with `git filter-repo`
- [ ] Remove `@Public()` from all data controllers; add connector API key auth for event ingestion
- [ ] Wire `express-rate-limit` to auth endpoints in `main.ts`
- [ ] Add `helmet()` middleware and restrict `enableCors()` to allowed origins
- [ ] Run all containers as a non-root user (add `USER` directive to all Dockerfiles)
- [ ] Replace OIDC URL token delivery with a short-lived code exchange flow
