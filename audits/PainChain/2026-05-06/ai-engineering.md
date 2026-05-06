# AI Engineering - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-ai-engineering
**Auditor:** AnchorStack

## Summary

Claude Code is the primary AI coding tool in active use. The team has produced detailed architecture plans and implementation guides, and commits follow a consistent conventional-commits format that shows intentional development workflow. The AI engineering posture has two significant problems. First, the context available to the agent is sparse: the only AI instruction file is a generic eight-rule `CLAUDE.md` that gives no project-specific guidance on the NestJS/Prisma stack, multi-tenant model, security constraints, or connector architecture. Second, the `.claude/settings.local.json` file is tracked by git and contains a real JWT access token hardcoded into the allowed Bash command list — a credentials exposure that worsens the existing `.env` leak. Large AI-assisted commits (1,300–2,800 line additions in a single commit) arrive without test coverage, and temporary security bypasses (`@Public()`) from those commits remain unresolved, indicating that AI-generated "migration states" are becoming permanent without a gate to close them.

## AI Engineering Map

**Primary AI workflow:** Claude Code used interactively for planning, implementation, and debugging. Evidence: `.claude/settings.local.json`, `docs/contributing/CLAUDE.md`, large single-commit feature deliveries, and 4,800+ lines of AI-style implementation planning docs (OIDC_IMPLEMENTATION.md, MULTI_TENANT_IMPLEMENTATION.md, FRONTEND_AUTH_PLAN.md).
**Context posture:** Ad hoc — one generic instruction file, no stack-specific rules, no tenets, no architecture summary for agents.
**Spec posture:** Plan-then-implement — detailed design documents exist before code, but plans are not connected to acceptance criteria, tests, or PR checklists. Plans remain as in-repo markdown files after implementation, creating stale-context risk.
**Validation posture:** Absent — no CI gates block merge for the v2 repo paths; no pre-commit hooks; no tests to run.
**Highest-risk AI surface:** `.claude/settings.local.json` tracked in git with a hardcoded JWT token in the permitted Bash command list. The token grants authenticated API access and is now in every clone of the repository.

### AI Tools And Code Helpers

| Tool/helper | Used for | Scope/permissions | Evidence |
|-------------|----------|-------------------|----------|
| Claude Code (CLI) | Planning, implementation, debugging | Repo + Docker exec + curl + Prisma migrations | `.claude/settings.local.json` |
| GitHub Actions | Build, release, helm publish | Repo, GHCR | `.github/workflows/` |

### Context Inventory

| Context source | Purpose | Freshness/owner | Quality |
|----------------|---------|-----------------|---------|
| `docs/contributing/CLAUDE.md` | Agent/contributor rules | Unknown freshness; appears static | Generic — 8 rules, none stack-specific. References `pytest` and `pre-commit` which don't exist in this repo. |
| `ARCHITECTURE.md` | System design reference | Written Dec 2025; partially stale (says "Planning Phase") | High-detail design doc but not formatted as agent instructions |
| `OIDC_IMPLEMENTATION.md` | OIDC design plan | Jan 2026; implemented (now stale) | 1,355 lines; post-implementation plan, not a living spec |
| `MULTI_TENANT_IMPLEMENTATION.md` | Multi-tenant plan | Jan 2026; implemented (now stale) | 1,103 lines; same pattern |
| `FRONTEND_AUTH_PLAN.md` | Frontend auth plan | Jan 2026; partially implemented | 2,379 lines; largest doc in repo |
| `.claude/settings.local.json` | Claude Code permissions | Active | Contains hardcoded JWT token and DB password in allow list |
| `docs/contributing/CONNECTOR_GUIDE.md` | Connector build guide | Dec 2025 | Useful for context; not AI-formatted |
| `features.json` | Feature registry | Stale (reflects v1 FastAPI features) | Not useful as agent context |

### Project Tenets

| Tenet/rule | Category | Documented where? | Enforced how? |
|------------|----------|-------------------|---------------|
| "Sanitize all user inputs" | Security | `docs/contributing/CLAUDE.md` | Not enforced; ValidationPipe absent |
| "Never log or expose sensitive data" | Security | `docs/contributing/CLAUDE.md` | Not enforced; debug console blocks in production |
| "Run all tests and linters before push" | Testing | `docs/contributing/CLAUDE.md` | Not enforced; no test suite exists |
| "Use descriptive commit messages" | Delivery | `docs/contributing/CLAUDE.md` | Partially followed (conventional commits visible) |
| "Add every new feature to features.json" | Documentation | `docs/contributing/CLAUDE.md` | Not followed; v2 features not in features.json |
| No auth bypass in data endpoints | Security | Not documented | Not enforced anywhere |
| No secrets in git | Security | Not documented | Violated in `.env` and `.claude/settings.local.json` |
| Connector independence principle | Architecture | `ARCHITECTURE.md` | Not enforced; informal |

### Spec And Delivery Evidence

| Artifact | Used for | Connected to implementation? | Evidence |
|----------|----------|------------------------------|----------|
| `OIDC_IMPLEMENTATION.md` (1,355 lines) | OIDC design plan | Partially — code was written from it, plan not updated | Root dir |
| `MULTI_TENANT_IMPLEMENTATION.md` (1,103 lines) | Multi-tenant auth plan | Partially — implemented but plan lists unresolved items | `painchain/backend/` |
| `FRONTEND_AUTH_PLAN.md` (2,379 lines) | Frontend auth design | Partially — some features in WIP state | `painchain/frontend/` |
| `ARCHITECTURE.md` (19KB) | System architecture | Yes, but stale (says "Planning Phase"; v2 is running) | Root dir |
| Commit messages | Delivery evidence | Describes what changed, not how it was tested | `git log` |

### Validation And Safety Gates

| Gate | Required for AI changes? | Evidence |
|------|--------------------------|----------|
| Lint | No | `npm run lint` exists for frontend; no CI enforcement on v2 paths |
| Type check | No | `tsc -b` for frontend; no CI |
| Tests | No | No test suite exists |
| Build | No | No CI for v2 paths |
| Security scan | No | None |
| Browser testing | No | Not documented |
| PR review | Unknown | No branch protection evidence |
| Human review of generated code | Unknown | Single-author commits throughout |

## Findings

### Real JWT Token Hardcoded in Tracked `.claude/settings.local.json`

**Severity:** Critical
**Category:** Secrets Management / Tool Safety
**Location:** `.claude/settings.local.json` (tracked in git, confirmed via `git ls-files`)

The file contains the full JWT bearer token as part of an allowed Bash command. The token appears to be a real session token for user `alice@example.com` with role `owner` on a tenant. The `.claude/settings.local.json` is tracked by git, so this token is present in the full git history of every clone and fork. This file also hardcodes the database password in a Prisma command allow pattern: `DATABASE_URL="postgresql://painchain:CrazyCowardClowns11@localhost:5432/..."`. Both secrets were already present in `.env` but this file compounds the exposure by appearing in a different location that reviewers might not think to check.

**Recommendation:** (1) Remove `.claude/settings.local.json` from git tracking immediately (`git rm --cached .claude/settings.local.json`). (2) Add `.claude/settings.local.json` to `.gitignore`. (3) Rotate the JWT and revoke the session. (4) Re-add the Bash allow rules without embedded credentials — use `$DATABASE_URL` (the environment variable) rather than the literal connection string in the allow pattern.

---

### CLAUDE.md Is Generic and References Non-Existent Tools — Provides No Useful Agent Guidance

**Severity:** High
**Category:** Context Quality
**Location:** `docs/contributing/CLAUDE.md`

The only AI instruction file gives 8 generic rules applicable to any codebase. It references `pytest` (not used), `pre-commit` (not configured), and "regression tests" (don't exist). It says "sanitize all user inputs" but gives no guidance on how this maps to the NestJS `ValidationPipe` + `class-validator` pattern the project chose. It says "never log sensitive data" but gives no examples relevant to Prisma error objects or JWT payloads. Most critically, it says nothing about the multi-tenant isolation requirement — the most important invariant in the codebase — or about the `@Public()` rule and when it is safe to use. An agent following this file would have no guidance on the decisions that matter most.

**Recommendation:** Replace the generic CLAUDE.md with a project-specific version covering: (1) the NestJS module pattern and where new routes go; (2) the multi-tenant isolation rule (every query that touches user data must scope by `tenantId`); (3) the `@Public()` decorator is for anonymous access only — never use it on data endpoints; (4) `ValidationPipe` must be used with every new DTO; (5) the Prisma schema is the source of truth — no migrations without `prisma migrate dev`. Put the file at the repo root as `CLAUDE.md` so Claude Code discovers it automatically.

---

### AI-Assisted Implementation Plans Left as Large Stale Docs After Feature Delivery

**Severity:** Medium
**Category:** Context Management / Stale Context Risk
**Location:** `OIDC_IMPLEMENTATION.md`, `MULTI_TENANT_IMPLEMENTATION.md`, `FRONTEND_AUTH_PLAN.md`

Three large planning documents (totaling 4,837 lines) were created before implementation and remain in the repo after the features were built. These docs describe design intentions, open questions, and phased rollout plans that may no longer reflect the actual implementation. A future agent reading `OIDC_IMPLEMENTATION.md` would get instructions for things like "Step 3: Implement the OIDC callback" that are already done — but the doc doesn't say so. These documents also contain security recommendations (e.g., "use PKCE") that were not implemented, which an agent might interpret as current requirements or skip as already done.

**Recommendation:** Move post-implementation planning docs to a `docs/design/` or `context/` folder and annotate them with `**Status: Implemented — see commit X**`. Remove or archive sections that are no longer accurate. Consider using a `context/pdr/` (Project Decision Record) pattern for ongoing decisions rather than monolithic implementation plans.

---

### Large Single-Commit AI-Assisted Features Without Test Evidence

**Severity:** Medium
**Category:** Validation Gates / Delivery Quality
**Location:** Commits `4a5a884` (OIDC, +2,800 lines), `d107043` (multi-tenant auth, +2,800 lines), `0268738` (connector events, +1,432 lines)

The three largest recent commits each add 1,400–2,800 lines in a single commit, covering complete subsystem implementations. This is a pattern typical of Claude Code or similar agent-generated code: plan → generate → commit. These commits have no test coverage (confirmed: no test files exist), no CI validation on v2 paths, and introduced the `@Public() // Temporary` annotations that remain unresolved. The multi-tenant auth commit added 1,103 lines of implementation plan documentation alongside 1,736 lines of code in one push — consistent with an agent-driven workflow where the spec and implementation are generated together.

**Recommendation:** Establish a pre-commit checklist for agent-generated code: (1) Does the code compile? (2) Does it match the design intent? (3) Are the temporary markers tracked in an issue? (4) Is a follow-up PR planned within the same sprint? For large features, require at least one integration test before closing the branch.

---

### Claude Code Has Permission to Run `docker exec` and `curl` Without Scope Restriction

**Severity:** Medium
**Category:** Tool Safety / Permissions
**Location:** `.claude/settings.local.json:8,9`

The allowed Bash commands include `Bash(docker exec:*)` and `Bash(curl:*)` with wildcard suffixes. This means Claude Code can execute arbitrary commands inside any running container and make HTTP requests to any URL. In the context of this codebase (which includes a running PostgreSQL container), `docker exec` allows the agent to run `psql` commands directly against the production database without a separate approval prompt. The `curl` wildcard allows arbitrary outbound HTTP requests.

**Recommendation:** Restrict `docker exec` to specific, read-only operations (e.g., `Bash(docker exec painchain-postgres pg_isready:*)`). Remove the wildcard `curl` permission and only allow specific, known-safe URL patterns. Use the minimal permission set needed for active work and tighten it after debugging sessions.

---

### `features.json` Is Stale and Reflects v1 Architecture — Misleads Agent Context

**Severity:** Low
**Category:** Context Quality / Stale Docs
**Location:** `features.json`

`features.json` lists features like `"rest_api": "Read-only FastAPI service with filtering and statistics endpoints"` and `"react_dashboard"` that describe the v1 (deprecated) architecture, not v2. The `docs/contributing/CLAUDE.md` instructs agents to "add every new feature to features.json" — but if an agent reads this file for context, it would understand the system as a FastAPI backend with Celery polling rather than the current NestJS/Prisma/connector architecture.

**Recommendation:** Update `features.json` to reflect v2 features (NestJS backend, OIDC auth, multi-tenant, connector containers). Delete v1 feature entries that no longer apply. Alternatively, rename it `features.v1.json` and create a new v2 version.

---

## Score

**Section score:** 3 / 10

AI tooling (Claude Code) is clearly the primary development driver and has produced working, thoughtfully-designed code. The score is reduced by: a real JWT token hardcoded in a tracked settings file (critical), a generic context file that fails to communicate any project-specific constraints to the agent, and no validation gates to catch temporary AI-generated states before they become permanent. The planning docs pattern is promising — the team thinks before it generates — but plans are not connected to acceptance criteria, tests, or delivery checklists.

## Recommendations Summary

- [ ] Remove `.claude/settings.local.json` from git tracking; rotate the exposed JWT session token; rebuild the allow list without embedded credentials
- [ ] Replace `docs/contributing/CLAUDE.md` with a project-specific `CLAUDE.md` at repo root covering tenant isolation rules, `@Public()` usage, ValidationPipe, and migration requirements
- [ ] Add a pre-merge checklist for agent-generated code: compile check, temporary-marker tracking, and at least one integration test per new endpoint
- [ ] Annotate stale planning docs (OIDC_IMPLEMENTATION.md, MULTI_TENANT_IMPLEMENTATION.md, FRONTEND_AUTH_PLAN.md) with implementation status and move to `docs/design/`
- [ ] Update `features.json` to reflect v2 architecture so agent context matches the actual codebase
