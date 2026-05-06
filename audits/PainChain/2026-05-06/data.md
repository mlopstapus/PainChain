# Data Layer - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-data
**Auditor:** AnchorStack

## Summary

The data layer has good bones: the Prisma schema is thoughtfully modeled, tenant ownership FKs are consistent, event deduplication uses a proper DB unique constraint, and critical indexes exist on the event table. The data layer is **not safe to evolve** because there are no migration files — only `prisma db push`, which applies schema diffs destructively and cannot be rolled back. It is **not safe to operate** because API tokens (GitHub PATs, GitLab tokens) are stored as plain JSON in `Integration.config` with no encryption. It is **not safe to recover** because there is no backup configuration, no restore procedure, and the only schema history is the current `schema.prisma` file. Role, status, and connector type are free-form strings rather than enums, creating silent data integrity gaps. The invitation `useCount` check has a TOCTOU race condition that allows over-use of single-use links.

## Data Map

**Primary data architecture:** Single PostgreSQL 16 database accessed exclusively through Prisma 7 ORM. All persistent state — events, users, tenants, sessions, integrations, OIDC providers, teams, invitations — lives in this one database. No caching layer, no message queue, no search index, no object storage. The database is the sole source of truth for all business state.

**Environment/location:** Docker volume (`postgres_data`) for local/self-hosted deployment. No managed database service observed. No connection pooling middleware (PgBouncer, etc.). The pg.Pool in `PrismaService` uses default pool size (10 connections).

**Replayability:** Not replayable from repo artifacts. There are no migration files under `prisma/migrations/`. A fresh environment requires only `prisma db push` to create the schema, but production state cannot be audited, rolled back, or replayed from migration history because no such history exists. The `prisma.config.ts` references `prisma/migrations` path but that directory does not exist.

**Recovery posture:** No backup configuration found. PostgreSQL runs on a Docker volume with no evidence of periodic snapshots, WAL archiving, or managed backup. There is no restore procedure or runbook. Data loss from disk failure, container deletion, or a destructive `db push` would be unrecoverable.

### Data Systems Inventory

| System | Type | Hosted/location | Source of truth for | Evidence |
|--------|------|-----------------|---------------------|----------|
| PostgreSQL 16 | Relational | Docker volume (local) | All business state: events, users, tenants, sessions, integrations, OIDC, teams, invitations | `docker-compose.yml`, `prisma/schema.prisma` |
| `localStorage` (browser) | Client key-value | Browser | JWT auth token only | `frontend/src/api/client.ts:19` |

### Schema And Ownership

| Entity/table | Owner scope | Keys/constraints | Indexes | Notes |
|--------------|-------------|------------------|---------|-------|
| `tenants` | System | PK: cuid, `slug` unique | None beyond PK | Cascade parent for all tenant-scoped tables |
| `integrations` | Tenant (optional) | PK: cuid, FK→tenant (Cascade) | None explicit | `config` JSON stores API tokens in plaintext |
| `events` | Tenant (optional) | PK: cuid, FK→tenant (Cascade), FK→integration (SetNull), `@@unique([integrationId,externalId])` | `[tenantId,connector,project,timestamp]`, `[tenantId,timestamp]`, `[timestamp]`, `[integrationId]`, `[externalId]` | Best-indexed table; good deduplication constraint |
| `projects` | Tenant (optional) | PK: cuid, FK→tenant (Cascade), `@@unique([tenantId,name,connector])` | None explicit | Derived from event data; unclear update path |
| `connector_types` | System | PK: string (e.g., "github") | None | No auth to register; overwritable by any process |
| `teams` | Tenant (optional) | PK: cuid, FK→tenant (Cascade), `@@unique([tenantId,name])` | `[tenantId]` | `tags` stored as `String[]` — unindexed |
| `users` | Tenant | PK: cuid, FK→tenant (Cascade, required), `email` globally unique | `[tenantId]`, `[email]`, `[tenantId,email]` | Soft-deleted via `isActive=false`; no `deletedAt` timestamp |
| `oidc_accounts` | User | PK: cuid, FK→user (Cascade), `@@unique([providerId,providerUserId])` | `[userId]`, `[providerId]` | `claims` JSON stores full OIDC response |
| `oidc_providers` | System | PK: string (e.g., "google") | `[isEnabled]` | `clientSecret` stored in plaintext column |
| `sessions` | User | PK: cuid, FK→user (Cascade), `token` unique | `[userId]`, `[token]`, `[expiresAt]` | Never cleaned up; grows unbounded |
| `tenant_invitations` | Tenant | PK: cuid, FK→tenant (Cascade), `token` unique | `[token]`, `[tenantId]`, `[createdBy]` | `useCount` race condition (see findings) |

### Data Flows

| Flow | Entry point | Systems touched | Sync/async | Integrity concern |
|------|-------------|-----------------|------------|-------------------|
| Event ingestion | `POST /api/events` (connector) | PostgreSQL (`events`, `integrations`) | Sync | No transaction: deduplication P2002 caught in application code; complex and fragile |
| User registration | `POST /api/auth/register` | PostgreSQL (`users`, `tenants`, `tenant_invitations`, `sessions`) | Sync | No transaction wrapping user+tenant+invitation-use: partial create possible |
| OIDC login (new user) | `GET /api/auth/callback` | PostgreSQL (`users`, `oidc_accounts`, `tenants`, `sessions`) | Sync | No transaction: user created then OIDCAccount linked; rollback if second step fails leaves orphan user |
| Invitation use | `POST /api/auth/register` with invitationToken | PostgreSQL (`tenant_invitations`, `users`) | Sync | TOCTOU: validate→use is two separate queries; concurrent registrations can both pass validation and both succeed |
| Session creation | Auth login/register | PostgreSQL (`sessions`) | Sync | Session rows never deleted; sessions are revoked but not purged |
| Schema evolution | `docker-compose up` → `prisma db push` | PostgreSQL (all tables) | Sync, blocking startup | Destructive; no rollback; no history |
| Integration token storage | `POST /api/integrations` | PostgreSQL (`integrations`) | Sync | API tokens stored in `config` JSON column, plaintext |

### Migrations And Recovery

| Area | Evidence | Assessment |
|------|----------|------------|
| Migrations | `prisma.config.ts` references `prisma/migrations` but directory does not exist | No versioned migrations; schema applied via `db push` only |
| CI/CD migration deployment | `.github/workflows/test.yml` references `prisma migrate deploy` at `apps/backend` (non-existent path) | Broken CI; no migration deployment gate |
| Backups | No backup config in `docker-compose.yml` or any script | No backups configured |
| Restore | No restore procedure or runbook found | Unknown/untested |
| Rollback/downgrade | No downgrade scripts; `db push` only | No rollback capability |

## Findings

### No Versioned Migrations — Schema Applied via `prisma db push` (Destructive)

**Severity:** Critical
**Category:** Migrations / Data Integrity
**Location:** `docker-compose.yml:44`, `painchain/backend/prisma.config.ts`

There are no migration files in `prisma/migrations/`. The production container runs `npx prisma db push` at startup, which compares the desired schema to the current database schema and applies the diff — including dropping columns or tables removed from `schema.prisma`. There is no migration history, no audit trail of schema changes, and no rollback path. A developer who removes a column from `schema.prisma` and deploys will silently destroy production data. The `prisma.config.ts` references `prisma/migrations` as the configured path but the directory does not exist, indicating the intent to use versioned migrations but the work was never completed.

**Recommendation:** Run `prisma migrate dev` to generate an initial migration from the current schema. Commit the resulting `prisma/migrations/` directory to the repo. Replace `prisma db push` in `docker-compose.yml` with `prisma migrate deploy`. Treat the initial migration as the baseline and add new migrations for every subsequent schema change.

---

### API Tokens Stored in Plaintext in Integration.config JSON Column

**Severity:** Critical
**Category:** Sensitive Data / Encryption
**Location:** `painchain/backend/prisma/schema.prisma:45`, `connectors/github/metadata.json:23`

`Integration.config` is a `Json` column that stores connector API tokens (GitHub Personal Access Tokens, GitLab tokens, etc.) as plaintext JSON. The config is returned to connectors via `GET /api/integrations` and is also exposed through the unauthenticated integrations endpoint. Anyone with database read access, any SQL injection, or any future backup that leaks can read live API tokens. This is structurally different from password storage (bcrypt-hashed) — API tokens need to be retrieved in plaintext to use them, but they should be encrypted at rest.

**Recommendation:** Encrypt the `config` field (or at minimum the token sub-field) using application-level encryption before writing to the database. Use a field-level encryption library (e.g., `@prisma/extension-field-encryption` or a custom Prisma middleware that encrypts/decrypts on write/read). Store the encryption key in an environment variable or secret manager, never in the database. This is a separate concern from general HTTPS.

---

### OIDC Client Secrets Stored in Plaintext Database Column

**Severity:** Critical
**Category:** Sensitive Data / Encryption
**Location:** `painchain/backend/prisma/schema.prisma:201`

`OIDCProvider.clientSecret` is a plain `String` column. OIDC client secrets are long-lived credentials that authorize the application to exchange authorization codes for access tokens. They are stored in the same unencrypted database that stores event data. A database dump or read-access compromise would immediately expose all OIDC client secrets for every configured provider.

**Recommendation:** Apply the same field-level encryption approach as for `Integration.config`. Alternatively, store OIDC provider configs only in environment variables (the `.env` OIDC_PROVIDERS approach already shown in `.env.example`) and do not persist them to the database at all — sync from env to DB at startup but treat the env var as the source of truth.

---

### No Database Backups Configured

**Severity:** Critical
**Category:** Backup / Recovery
**Location:** `docker-compose.yml`

There is no backup configuration for the PostgreSQL container. The database runs on a Docker volume with no WAL archiving, no periodic dump, and no managed backup service. Data loss from disk failure, accidental container deletion (`docker-compose down -v`), or a destructive `db push` is unrecoverable. The system's core product value is its event timeline — losing the database means losing the entire change history that teams rely on for incident investigation.

**Recommendation:** At minimum, add a `pg_dump` cron job that writes a compressed backup to a mounted volume or object storage. For a production deployment, use a managed PostgreSQL service (RDS, Supabase, Neon, etc.) with automated point-in-time recovery. Document a restore procedure and test it.

---

### Invitation useCount Has TOCTOU Race Condition — Multi-Use Invites Can Be Over-Used

**Severity:** High
**Category:** Concurrency / Data Integrity
**Location:** `painchain/backend/src/auth/services/invitation.service.ts:86-120`

`validateInvitation()` checks `useCount < maxUses`, then `useInvitation()` increments the counter as a separate query. Between these two operations, another concurrent registration using the same token can also pass the `useCount < maxUses` check. Both will succeed, exceeding `maxUses`. For `maxUses: 1` (single-use invitations), two concurrent registrations could both use the same invitation token and both create users. There is no unique constraint preventing this.

**Recommendation:** Replace the validate-then-update pattern with a single atomic conditional update: `UPDATE tenant_invitations SET use_count = use_count + 1 WHERE token = ? AND use_count < max_uses AND is_revoked = false AND expires_at > NOW()`. Check the affected row count — if 0, the invitation is invalid/exhausted. In Prisma, use `updateMany` with the full constraint in the `where` clause and check `count > 0`.

---

### User Registration Has No Wrapping Transaction

**Severity:** High
**Category:** Data Integrity / Partial Writes
**Location:** `painchain/backend/src/auth/auth.service.ts:82-186`

The `register()` method performs multiple sequential database writes: optionally create a `Tenant`, create a `User`, then mark the `TenantInvitation` as used. If any step after the first succeeds, a later step fails, and the process is interrupted, the database is left in a partial state: a `User` without a valid invitation record, or a `Tenant` with no users. None of these writes are wrapped in a `prisma.$transaction()`.

**Recommendation:** Wrap the full registration flow in a `prisma.$transaction()`. This includes tenant creation/lookup, user creation, and invitation usage marking. If any step fails, all writes roll back atomically.

---

### OIDC User Creation Not Wrapped in a Transaction

**Severity:** High
**Category:** Data Integrity / Partial Writes
**Location:** `painchain/backend/src/auth/auth.service.ts:295-319`

`handleOIDCLogin()` for new users creates a `User` and then creates an `OIDCAccount` linked to that user in a single `prisma.user.create()` with a nested `oidcAccounts.create`. This is actually a single Prisma operation — the nested create is handled in one statement. However, the tenant lookup/creation before this is a separate query, and if the tenant create succeeds but the user create fails (e.g., unique email constraint), the tenant is left orphaned. Similarly, session creation in `this.login()` is called after the user write completes with no rollback on failure.

**Recommendation:** Wrap the full OIDC login flow in a transaction that includes tenant lookup/create, user+OIDCAccount create, and session create. Use `prisma.$transaction()` with the interactive transaction API since you need the tenant result to create the user.

---

### Role, Status, and Connector Type Are Free-Form Strings Without DB Constraints

**Severity:** Medium
**Category:** Schema Design / Data Integrity
**Location:** `painchain/backend/prisma/schema.prisma:155`, `:43`, `:101`

`User.role` (`"owner"`, `"admin"`, `"member"`, `"viewer"`), `Integration.status` (`"active"`, `"inactive"`, `"error"`), and `Integration.type` / `ConnectorType.id` are all plain `String` fields with no database-level CHECK constraint or enum. Validation only happens in application code. A direct DB write, a Prisma bug, or a future code path that misses the validation can insert an invalid role value. A user with `role = "superadmin"` would bypass role checks silently because the guard compares against `["owner", "admin"]`.

**Recommendation:** Use Prisma enums for `User.role` and `Integration.status`. This generates PostgreSQL `ENUM` types that enforce valid values at the database level. For `Integration.type`, a FK to `ConnectorType.id` already exists via the relation — enforce it explicitly with a FK constraint rather than relying on application-level string matching.

---

### `User.isActive = false` Soft Delete Has No `deletedAt` Timestamp

**Severity:** Medium
**Category:** Schema Design / Auditability
**Location:** `painchain/backend/prisma/schema.prisma:148`

Users are soft-deleted by setting `isActive = false` (see `auth.service.ts:523`). There is no `deletedAt` timestamp, no `deletedBy` field, and the `User.email` unique constraint means the same email address can never be re-registered (the soft-deleted row still occupies the unique index). This makes it impossible to know when a user was removed, who removed them, or to allow the same email to re-join a different tenant.

**Recommendation:** Add `deletedAt DateTime?` and `deletedBy String?` fields to `User`. Update the `email` unique constraint to a partial index that excludes soft-deleted users (requires raw SQL migration). This is a schema change that requires a proper migration.

---

### Connection Pool Has No Explicit Limits — PostgreSQL Max Connections Risk

**Severity:** Medium
**Category:** Scalability / Reliability
**Location:** `painchain/backend/src/database/prisma.service.ts:10`

`new pg.Pool({ connectionString: process.env.DATABASE_URL })` uses the default pg pool maximum of 10 connections. PostgreSQL defaults to 100 max connections. With multiple connector containers also connecting, and with the JwtStrategy performing a DB write (`lastActivityAt`) on every request, the default pool will saturate under moderate traffic. There is no connection pool monitoring, no error handling for pool exhaustion, and no PgBouncer or similar middleware.

**Recommendation:** Set explicit pool limits: `new pg.Pool({ connectionString: ..., max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 })`. Add error handling for pool timeout. For production, add PgBouncer in transaction-pooling mode or use a managed connection pooler (Supabase/Neon built-in pooling, AWS RDS Proxy).

---

### `OIDCAccount.claims` Stores Full OIDC Response — PII Accumulation

**Severity:** Low
**Category:** PII / Data Minimization
**Location:** `painchain/backend/prisma/schema.prisma:179`, `auth.service.ts:307`

`OIDCAccount.claims` is a `Json` column that stores the full `userInfo` object from the OIDC provider. This includes names, email, profile picture URLs, locale, and any provider-specific claims. The claims are stored at account creation and updated on `lastUsedAt` (the column exists but claims are not re-fetched). Over time this accumulates stale PII that may not reflect the user's current information.

**Recommendation:** Store only the claims you actively use (e.g., `sub`, `email`, `email_verified`) rather than the full `userInfo` blob. If the full claims are needed for debugging, consider a retention policy that purges old values.

---

## Score

**Section score:** 3 / 10

The schema design is coherent and the event deduplication constraint is a deliberate, correct choice. Everything else about the data layer's operational posture is critically weak: no migrations, no backups, plaintext secrets in the database, no transactions on multi-step writes, and a race condition on invitation use. The system could lose all its data with no recovery path, and every API token it stores is one database read away from exposure.

## Recommendations Summary

- [ ] Generate initial migration with `prisma migrate dev` and replace `db push` with `prisma migrate deploy`
- [ ] Encrypt `Integration.config` and `OIDCProvider.clientSecret` at rest using field-level encryption
- [ ] Configure PostgreSQL backups (cron `pg_dump` at minimum; managed DB with PITR for production)
- [ ] Wrap `register()` and `handleOIDCLogin()` in `prisma.$transaction()` to prevent partial writes
- [ ] Fix invitation race condition with an atomic conditional increment in a single query
