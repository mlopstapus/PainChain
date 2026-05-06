# Delivery - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-delivery
**Auditor:** AnchorStack

## Summary

PainChain's delivery process for v2 is effectively direct-to-branch with no gates. All v2 work since December 2025 — including the OIDC auth system (3,956 lines added in one commit) and the multi-tenant model (2,839 lines added in one commit) — was committed directly to `checkout/start-from-scratch` without pull requests, without CI running against those commits, and without any review. All four CI/CD workflows are broken because they reference v1 paths (`apps/backend/`, `frontend/`, `helm/`) that do not exist in v2. The prior v1 delivery process shows maturity: feature branches, pull requests with PR numbers, Helm chart versioning, and tagged releases (v0.1.0–v0.2.4) — but none of this carries forward to v2. There are zero automated tests, no branch protection on the working branch, and no migration gate before production schema changes.

## Delivery Map

**Delivery posture:** Manual / ad hoc. v2 development bypasses all CI gates via direct commits on a long-running feature branch. v1 delivery process documented in `RELEASE.md` is not followed for v2.
**Primary deployment path:** `docker-compose up` from a developer machine (v2). GHCR images (built via broken CI). Helm chart for Kubernetes (not wired to v2).
**Environment promotion:** None. Single environment (local Docker Compose). No staging, no preview, no promotion step.
**Gate posture:** Missing. CI workflows exist but are broken. No required status checks. No tests. No security scans.
**Rollback posture:** Manual — re-run Compose with a pinned image tag. No migration rollback. No automated rollback trigger.
**Highest-risk delivery assumption:** That `checkout/start-from-scratch` branch commits are safe to deploy because the developer ran them locally — no automated verification of any kind.

### Pipeline And Environment Inventory

| Environment | Trigger | Build artifact | Gates | Secrets source | Approval/owner |
|-------------|---------|----------------|-------|----------------|----------------|
| Local (only env) | `docker-compose up` (manual) | Local Docker build from repo | None | `.env` committed to git | No approval |
| Main branch image (broken) | Push to `main` | Docker image → GHCR (fails — stale paths) | None (broken) | `secrets.GITHUB_TOKEN` | None |
| Release image (broken) | Push tag `v*` | Docker image → GHCR (fails — stale paths) | None (broken) | `secrets.GITHUB_TOKEN` | None |

### CI/CD Gates

| Gate | Command/tool | Required before merge? | Required before deploy? | Evidence |
|------|--------------|------------------------|-------------------------|----------|
| Lint (frontend) | `npm run lint` | No | No | `eslint.config.js` exists; not in CI |
| Type check (frontend) | `tsc -b` (via build) | No | No | `tsconfig.app.json` |
| Type check (backend) | `nest build` | No | No | `tsconfig.json` |
| Unit tests | None exist | — | — | No `.spec.ts` files |
| Integration tests | None exist | — | — | No test files |
| Build (CI) | `docker build` | No (broken) | No (broken) | `build-main.yml` — v1 paths |
| Security scan | None | — | — | Not configured |
| Image scan | None | — | — | Not configured |
| Migration gate | None | — | — | `prisma db push` at startup, no gate |
| Branch protection | Unknown | Unknown | — | No evidence; CODEOWNERS exists but no protection config found |

### Release, Package, And Versioning

| Artifact/package | Version/tag strategy | Publishing/promotion | Traceability |
|------------------|----------------------|----------------------|--------------|
| v1 Docker images (GHCR) | Semver tags (`v0.1.0`–`v0.2.4`) + `:main` bleeding edge | Released via GitHub Actions (working for v1) | Traceable to git tags |
| v2 app | No version/tag strategy in v2 | No release process | No traceability |
| Helm chart | `Chart.yaml` version matched to git tag (v1 pattern) | Pushed to GHCR OCI registry | Traceable via chart version |
| Backend `package.json` | `2.0.0` (hardcoded, never bumped) | Not published | Not bumped between releases |
| Frontend `package.json` | `0.0.0` (placeholder) | Not published | No version tracking |
| CHANGELOG | None | — | Not found |

### Container Image Flow

| Image | Build location | Registry | Tags/digests | Cache strategy | Security gate |
|-------|----------------|----------|--------------|----------------|---------------|
| `painchain-backend` (v1) | GitHub Actions (broken for v2) | `ghcr.io/<owner>/painchain-backend` | `:latest`, `:v0.x.x`, `:main` (mutable tags) | GHA cache (`type=gha`) | None — no image scan |
| `painchain-frontend` (v1) | GitHub Actions (broken for v2) | `ghcr.io/<owner>/painchain-frontend` | Same | Same | None |
| `painchain` (v2 unified) | Local `docker-compose build` | Not pushed | Local only | None | None |
| Connector images (v2) | Local `docker-compose build` | Not pushed | Local only | None | None |

### Rollback And Hotfix

| Scenario | Mechanism | Data/migration concern | Verification |
|----------|-----------|------------------------|--------------|
| Bad app deploy | Re-run `docker-compose up` with previous image tag | `prisma db push` at startup runs against old schema — may drop columns added in the rolled-forward version | None — no smoke test or alert |
| Bad schema change | No rollback — `prisma db push` is destructive and one-way | High — dropped columns cannot be recovered without a backup | None |
| Security hotfix | Branch from tag, fix, push new tag, re-deploy (documented in RELEASE.md) | Same migration concern | None automated |
| Container process crash | `restart: unless-stopped` auto-restarts | N/A | No notification |

## Findings

### V2 Development Commits Directly to Branch — No Pull Requests, No Review

**Severity:** Critical
**Category:** Branch / Review Discipline
**Location:** `checkout/start-from-scratch` branch — 17 commits ahead of `main`, single author throughout

All v2 development (December 2025–January 2026) is committed directly to the `checkout/start-from-scratch` long-running branch. There are no pull requests for v2 work. Commits including `feat(auth): create oidc for the backend` (3,956 lines added) and `add multi-tenant auth` (2,839 lines added) land as direct commits with no review, no required checks, and no approval. The CODEOWNERS file names `@mlopstapus` as the approver for all changes, but there is no evidence of PR review or approval against any v2 commit.

This means the codebase's most security-critical changes — the auth system, multi-tenant isolation model, and session management — were never reviewed by a second human. Combined with the AI-assisted development pattern (large single-commit deliveries), the risk is that assumptions made by Claude Code while generating code were never challenged before the code became the working implementation.

**Recommendation:** Open a pull request from `checkout/start-from-scratch` to `main` and conduct a review before any deployment. Establish a policy that all future changes require a PR with at least one review. Enable GitHub branch protection on `main` requiring PR reviews and passing status checks. The `feature/add-tests` branch suggests the intent to add CI gates exists — connect that intent to branch protection enforcement.

---

### All CI/CD Workflows Are Broken — No Automated Gate Has Run Against V2

**Severity:** Critical
**Category:** CI/CD Integrity
**Location:** `.github/workflows/build-main.yml`, `.github/workflows/release.yml`, `.github/workflows/test.yml`

As documented in the infra audit, all four CI/CD workflows reference v1 paths. The practical consequence from a delivery standpoint is that no automated gate — no build, no test, no lint, no image scan — has ever run against a single line of v2 code. The codebase has been developed entirely without CI feedback. Every commit since December 2025 landed in the working branch with zero automated verification.

This compounds the zero-tests finding: it is not merely that tests don't exist, it is that even if tests were added, the CI workflow that would run them references a path that doesn't exist and would still fail.

**Recommendation:** Fix CI/CD workflow paths as the first delivery task (documented in the infra audit recommendations). After fixing, add required status checks to the `main` branch in GitHub's branch protection settings. Treat a successful CI run as a prerequisite for the PR merge from `checkout/start-from-scratch` → `main`.

---

### Zero Tests — No Automated Verification Of Any Application Behavior

**Severity:** Critical
**Category:** Test Gates
**Location:** `painchain/backend/src/`, `painchain/frontend/src/`

No `.spec.ts` or `.test.ts` file exists anywhere in the v2 application source. The `@nestjs/testing` package is installed in the backend, and the `feature/add-tests` branch exists (suggesting this was recognized as a gap), but neither has produced any test files in the current working branch. The backend auth system — which includes JWT validation, session management, OIDC callback handling, tenant isolation via RBAC, and invitation acceptance — has zero test coverage.

Without tests, there is no automated evidence that: the auth guard blocks unauthorized access, tenant isolation prevents cross-tenant reads, the OIDC flow produces valid sessions, invitation validation limits concurrent registrations, or that the `@Public()` annotations were intentionally placed. The delivery process currently has no gate that would catch a regression in any of these critical paths.

**Recommendation:** Write integration tests for the auth critical path using `@nestjs/testing` with a real test PostgreSQL database (the CI workflow already configures one as a service). Minimum test cases: successful login, failed login with wrong password, 401 without JWT token, 401 with revoked session, OIDC callback creates a session, and tenant A cannot read tenant B's data. These six tests provide meaningful regression protection and are achievable within a few hours.

---

### Release Process Documentation Describes V1 Architecture — Stale And Misleading For V2

**Severity:** High
**Category:** Release Documentation / Process
**Location:** `docs/contributing/RELEASE.md`

The release documentation describes testing steps that reference `docker compose ps` expecting services named `painchain-redis`, `painchain-celery-worker`, and `painchain-celery-beat` — none of which exist in v2. It references `http://localhost:8000/docs` (FastAPI Swagger) and building from `apps/backend/Dockerfile` and `frontend/Dockerfile`. A developer following this document for a v2 release would be verifying the wrong service names, using the wrong Dockerfile paths, and expecting a Swagger UI that doesn't exist in NestJS.

This is both a documentation quality issue and a process safety issue: the release runbook is incorrect for the system it is supposed to govern.

**Recommendation:** Update `docs/contributing/RELEASE.md` to reflect v2: correct service names, v2 Dockerfile paths, NestJS API (no Swagger by default), correct `docker-compose ps` output, and v2-specific pre-release checks. Remove all references to Redis, Celery, and FastAPI.

---

### No Migration Gate In Release Process — Schema Changes Applied Destructively At Startup

**Severity:** High
**Category:** Migration Release Mechanics
**Location:** `docker-compose.yml:44`

The `prisma db push` startup command (raised as Critical in the data audit and High in the infra audit) also represents a delivery failure: schema changes are applied automatically at container startup with no review step, no migration file, no approval, and no rollback path. A developer who changes `schema.prisma`, builds the image, and deploys will silently drop any columns removed from the schema — with no warning and no record of what changed. The release process document does not mention schema migration at all.

**Recommendation:** Before the next release, generate an initial migration (`prisma migrate dev`), commit it, and update the startup command to `prisma migrate deploy`. Add a migration review step to the pre-release checklist: any PR that touches `schema.prisma` should include the generated migration file and a brief description of what data changes (additions, removals, backfills) it makes.

---

### One CI Action Pinned to `@master` — Mutable Dependency in Build Pipeline

**Severity:** Medium
**Category:** Supply Chain / CI Safety
**Location:** `.github/workflows/helm-test.yml:86`

`instrumenta/kubeval-action@master` is pinned to a mutable branch reference rather than a specific tag or SHA. All other GitHub Actions in the workflows use version tags (v3, v4, v5), which are better but still mutable. The recommended practice for CI supply chain safety is SHA pinning (`uses: instrumenta/kubeval-action@<sha>`). A compromised or updated `@master` action could execute arbitrary code in the CI runner, which has `packages: write` permission to GHCR.

**Recommendation:** Pin `instrumenta/kubeval-action` to a specific commit SHA. As a broader practice, consider using a tool like `Renovate` or `Dependabot` with its GitHub Actions update mode to keep all action versions current and SHA-pinned. The `@master` reference is the most urgent fix.

---

### CHANGELOG Absent — No Release Notes For Any V2 Delivery

**Severity:** Medium
**Category:** Release Documentation
**Location:** Repository root

No `CHANGELOG.md` exists in the v2 repository. The v1 release process includes instructions for maintaining a changelog, but v2 has no such record. The git tag `v0.1.0`–`v0.2.4` correspond to v1 releases. v2 has no release tags, no version record, and no record of what changed between the December 2025 and January 2026 development period. For a self-hosted product, users who upgrade between versions have no way to know what security, API, or behavioral changes they should expect.

**Recommendation:** Add a `CHANGELOG.md` before the first v2 release. Use Keep a Changelog format. The GitHub release workflow already auto-generates a changelog from commit messages for tagged releases — extend it to also update `CHANGELOG.md` as part of the release process.

---

## Score

**Section score:** 2 / 10

V1 delivery showed genuine process maturity: feature branches, PRs, required reviews, versioned Helm chart releases, and a documented release process. v2 has abandoned all of it. Every line of v2 code was committed without CI, without PR review, and without tests. The CI workflows exist but are broken. The release documentation describes a different architecture. No migration gate exists. The delivery process for v2 is a single developer running `docker-compose up` locally. For a product that handles multi-tenant PII, API tokens, and incident-investigation data for production teams, this delivery posture creates unacceptable risk for any real user deployment.

## Recommendations Summary

- [ ] Open a PR from `checkout/start-from-scratch` → `main`, conduct a review, and enable GitHub branch protection requiring PR approval and passing CI checks before any future merge
- [ ] Fix CI/CD workflow paths to target v2 directories (`painchain/Dockerfile`, `painchain/backend/`, `painchain/frontend/`) so that automated gates actually run against v2 code
- [ ] Add integration tests for the auth critical path (login, 401 without JWT, tenant isolation) using `@nestjs/testing` and the CI-configured test PostgreSQL service
- [ ] Add `prisma migrate deploy` to the pre-release checklist and replace `prisma db push` in the startup command; include migration files in PRs that change the schema
- [ ] Update `docs/contributing/RELEASE.md` to describe v2 architecture and add a `CHANGELOG.md` before the first v2 release
