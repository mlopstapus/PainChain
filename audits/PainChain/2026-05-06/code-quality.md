# Code Quality - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-code-quality
**Auditor:** AnchorStack

## Summary

The codebase is navigable and the auth subsystem is well-structured, but it is not safe to change at production pace. Five of six API controllers are marked `@Public()` as "temporary," bypassing the auth that was carefully built. `ValidationPipe` is never registered, so DTO decorators do nothing. There are zero application tests. The backend TypeScript config explicitly disables `strictNullChecks` and `noImplicitAny`. Debug `console.error` blocks left in `events.service.ts` expose internal Prisma error structure to logs. These gaps together mean critical paths (event ingestion, integration management) have no auth, no input validation, and no test coverage.

## Findings

### Five Controllers Permanently Marked @Public() "During Migration"

**Severity:** Critical
**Category:** Authentication / Authorization
**Location:** `painchain/backend/src/events/events.controller.ts:26`, `painchain/backend/src/integrations/integrations.controller.ts:39`, `painchain/backend/src/teams/teams.controller.ts:17`, `painchain/backend/src/api/timeline.controller.ts:5`, `painchain/backend/src/api/projects.controller.ts:5`

Every controller except `AuthController` is decorated `@Public() // Temporary: Allow unauthenticated access during migration`. This means event ingestion, integration CRUD, team management, timeline, and project endpoints are entirely unauthenticated. The JWT + Tenant guards built in `AppModule` have no effect on any of these surfaces. The comment calls it temporary but there is no tracking issue, no feature flag, and no test asserting auth is required.

**Recommendation:** Remove `@Public()` from all non-auth controllers. Use the injected `validatedTenantId` (set by `TenantGuard`) in controllers rather than reading `x-tenant-id` headers directly. Add an integration test that asserts a 401 is returned without a valid token.

---

### ValidationPipe Not Registered — DTO Decorators Do Nothing

**Severity:** Critical
**Category:** Input Validation
**Location:** `painchain/backend/src/main.ts`

`RegisterDto` and `LoginDto` use `class-validator` decorators (`@IsEmail`, `@MinLength`, etc.), but `app.useGlobalPipes(new ValidationPipe())` is never called in `main.ts`. This means the decorators are compiled but never executed. Any string can be submitted as an email; passwords can be 1 character; required fields can be omitted. NestJS only strips/validates bodies when `ValidationPipe` is globally registered.

**Recommendation:** Add `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))` to `main.ts`. Add DTOs for event creation and integration creation (currently typed as raw `Prisma.*CreateInput`, which bypasses any business validation).

---

### Backend TypeScript Strict Mode Disabled

**Severity:** High
**Category:** Type Safety
**Location:** `painchain/backend/tsconfig.json`

`"strictNullChecks": false` and `"noImplicitAny": false` are both explicitly set in the backend tsconfig. This means: null/undefined can flow silently through all service and database code without a compiler error, and untyped function arguments are accepted without warning. The frontend uses `strict: true` with `noUnusedLocals` and `noUnusedParameters` — the backend is a significant step backwards.

**Recommendation:** Enable `"strict": true` in the backend tsconfig and fix the resulting errors. The errors themselves will likely surface real bugs (null-access on Prisma results, unguarded optional fields). Fix in order: auth services first (highest risk), then events and integrations.

---

### Zero Application Tests

**Severity:** High
**Category:** Missing Test Coverage
**Location:** `painchain/backend/src/`, `painchain/frontend/src/`

There are no `.spec.ts` or `.test.ts` files anywhere in the application source. The backend has a full auth system (JWT, OIDC, invitations, RBAC, session revocation) with zero test coverage. The CI workflow's `test.yml` references `apps/backend` (old path — nonexistent) so even if tests were added, CI would not run them. The `@nestjs/testing` package is installed, indicating test infrastructure was intended but never set up.

**Recommendation:** Start with integration tests for the auth critical path: successful login, rejected login, OIDC callback, invitation acceptance, and tenant isolation (user A cannot access user B's data). Use `@nestjs/testing` with a real test database (already configured in the old CI workflow as a model).

---

### Debug Console Blocks Left in Production EventsService

**Severity:** High
**Category:** Code Clarity / Operational Risk
**Location:** `painchain/backend/src/events/events.service.ts:25-52`

The `create()` method contains seven `console.error('=== ... ===')` debug lines that stringify Prisma internal error metadata including `driverAdapterError.cause.constraint.fields`. These are clearly debugging artifacts, not intentional logging — the `===` delimiters and `JSON.stringify(error.meta, null, 2)` are diagnostic probes. In production, these dump structured Prisma internals to stdout on every duplicate-event attempt, which is a high-volume and expected code path (connectors poll repeatedly).

**Recommendation:** Remove all `console.*` calls in `events.service.ts`. Replace with the existing `this.logger` instance. The duplicate-event logic itself is correct and useful — only the debug output needs removal.

---

### IntegrationsService.update and .remove Ignore tenantId Parameter

**Severity:** High
**Category:** Authorization / Data Isolation
**Location:** `painchain/backend/src/integrations/integrations.service.ts:29-43`

Both `update()` and `remove()` accept a `tenantId` parameter but completely ignore it in the Prisma query. The `where` clause is `{ id }` only — any caller who provides the correct `id` can update or delete any integration regardless of tenant. The `findOne()` method correctly uses `tenantId`, making this an inconsistency that could silently allow cross-tenant writes.

**Recommendation:** Add `tenantId` to the `where` clause in both `update()` and `remove()`. Use `updateMany`/`deleteMany` with tenant filter, or add a pre-check that verifies the integration belongs to the tenant before modification.

---

### Controller Accesses Private Service Members via Bracket Notation

**Severity:** Medium
**Category:** Code Clarity / Architecture
**Location:** `painchain/backend/src/auth/auth.controller.ts:175,187`

`logout()` and `logoutAll()` call `this.authService['sessionService'].revokeSession(...)`, bypassing the TypeScript `private` modifier with bracket notation. This indicates `AuthService` doesn't expose the needed methods publicly, so the controller reaches through it to the dependency directly. This creates implicit coupling between the controller and `AuthService`'s internal structure.

**Recommendation:** Add `logout(sessionId: string)` and `logoutAll(userId: string)` methods to `AuthService` and call those instead. The service already has `revokeUserSession` which is close — just expose `logout` and `logoutAll` as proper public API.

---

### Role Enforcement Uses NotFoundException Instead of ForbiddenException

**Severity:** Medium
**Category:** Authentication / Error Handling
**Location:** `painchain/backend/src/auth/auth.controller.ts:313`, `painchain/backend/src/auth/auth.controller.ts:325`

`updateUserRole` throws `NotFoundException` when the caller lacks the required role, and `removeUser` also throws `NotFoundException`. These should throw `ForbiddenException` (HTTP 403). Returning 404 for auth failures leaks information about whether routes exist, and obscures the real cause from API consumers.

**Recommendation:** Replace `throw new NotFoundException(...)` with `throw new ForbiddenException(...)` in both cases. Consider extracting role checks into a `@Roles()` decorator with the existing `RolesGuard` (already present at `painchain/backend/src/auth/guards/roles.guard.ts`).

---

### Integration Config Stored as Opaque JSON with No Runtime Validation

**Severity:** Medium
**Category:** Input Validation / Data Quality
**Location:** `painchain/backend/src/integrations/integrations.controller.ts:25-37`, `painchain/backend/prisma/schema.prisma:44`

`Integration.config` is a free-form `Json` column that stores API tokens, repository lists, polling settings, etc. The only validation is `validateConfig()` which checks for `name` (string) and `tags` (array). No schema validation is applied to connector-specific fields (token, repositories, etc.). Invalid or malformed configs will be stored silently and only fail at runtime when the connector tries to use them.

**Recommendation:** Define a connector-type-specific config schema in `ConnectorType.configSchema` (already in the schema) and validate incoming Integration configs against it at creation time using a JSON Schema validator (e.g., `ajv`).

---

### Frontend API Client Returns Untyped Responses for Core Endpoints

**Severity:** Medium
**Category:** Type Safety
**Location:** `painchain/frontend/src/api/client.ts:186-267`

`getTimeline()`, `getEvents()`, `getProjects()`, `getIntegrations()`, `getIntegrationTypes()`, `getTeams()`, and their mutations all return `Promise<any>` or untyped responses via `this.request(...)` without a generic type argument. The frontend type system provides no protection from API shape changes for these core data flows. `useIntegrations.ts` and `useTeams.ts` also assign results to `any`.

**Recommendation:** Define response interfaces in `painchain/frontend/src/types/api.ts` for all API endpoints (integration, team, event, project) and pass them as generics to `this.request<T>(...)`. The auth types in `features/auth/types/auth.types.ts` show the right pattern — extend it to cover data types.

---

### Tag Filtering Implemented with In-Memory Filtering, Not DB Query

**Severity:** Low
**Category:** Architecture / Performance
**Location:** `painchain/backend/src/api/timeline.service.ts:23-47`

When tag filters are applied, `TimelineService` fetches all integrations from the database, then filters them in Node.js memory to find matching tags, then queries events by the matched IDs. This works at small scale but will degrade as the number of integrations grows. Tags are stored in `Integration.config` JSON, which is not indexed.

**Recommendation:** Move tags out of the JSON config into a dedicated column or separate table so they can be indexed and queried efficiently. Alternatively, use Prisma's `path` filtering for JSON columns (PostgreSQL `@>` operator) to push filtering to the database.

---

## Score

**Section score:** 3 / 10

The auth subsystem is thoughtfully designed but functionally bypassed by `@Public()` on the majority of controllers. `ValidationPipe` is absent, so DTO decorators are inert. Backend strict TypeScript is disabled. No tests exist. The codebase is not production-ready as-is — the security and validation gaps are not cosmetic, they are load-bearing gaps on critical data paths.

## Recommendations Summary

- [ ] Remove `@Public()` from all non-auth controllers and wire tenant-scoped auth through all data endpoints
- [ ] Register `ValidationPipe` globally in `main.ts` with `whitelist: true`
- [ ] Enable `strict: true` in `painchain/backend/tsconfig.json` and fix resulting errors
- [ ] Add `tenantId` to `update()` and `remove()` queries in `IntegrationsService`
- [ ] Remove debug `console.error` blocks from `events.service.ts` and replace with `this.logger`
