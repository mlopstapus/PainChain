# Documentation - PainChain

**Date:** 2026-05-06
**Skill:** as-audit-docs
**Auditor:** AnchorStack

## Summary

PainChain has substantial documentation volume — over 6,000 lines of planning and architecture documents, detailed connector READMEs, an OIDC configuration guide, and an AI context file — but the documentation is at odds with the actual system in several critical ways. The main README says "Planning Phase" and "Coming Soon" for the quick-start section while the v2 application is fully functional. `ARCHITECTURE.md` is a pre-implementation design document with 36 unchecked `[ ]` items describing work that has already been done. The three largest docs (`OIDC_IMPLEMENTATION.md`, `MULTI_TENANT_IMPLEMENTATION.md`, `FRONTEND_AUTH_PLAN.md`) say "Implementation: Not Started" or "Ready to Implement" but the implementations are complete. The `CLAUDE.md` agent context file references `pytest` and `pre-commit` (neither used), says nothing about the NestJS/Prisma stack, and gives no guidance on the multi-tenant invariant. `features.json` describes v1 FastAPI/Celery architecture. A new contributor relying on the README would think the project is in planning, not production-ready MVP.

## Documentation Map

**Documentation posture:** Sprawled — high volume of design-phase documents that were not updated after implementation. Accurate connector READMEs are the outlier.
**Canonical entry point:** `README.md` — but it describes a stale state ("Planning Phase") and the Quick Start section says "Coming Soon."
**Freshness posture:** Mixed/stale — connector READMEs and `OIDC_CONFIGURATION.md` are accurate. Main README, `ARCHITECTURE.md`, all three implementation plan docs, `features.json`, `RELEASE.md`, and `CLAUDE.md` describe a system that is behind or beside the current reality.
**Handoff posture:** Poor — a new engineer would not know the application is functional, would not find the correct docker-compose quick start, and would have no guidance on the multi-tenant isolation invariant (the most important safety constraint in the codebase).
**Runbook posture:** Missing — no operational runbooks exist for deploy, rollback, incident response, secret rotation, or data restore.
**Highest-risk docs gap:** No documentation of the multi-tenant isolation invariant and the `@Public()` rule means the most security-critical constraint in the codebase is enforced by no document, no test, and no gate.

### Documentation Inventory

| Area | Location | Purpose | Freshness | Owner/update signal |
|------|----------|---------|-----------|---------------------|
| Project overview | `README.md` | Project purpose, quick start, status | Stale — says "Planning Phase"; quick start says "Coming Soon" | No owner/date |
| System architecture | `ARCHITECTURE.md` | v2 design, repo structure, API spec | Stale — says "Status: Planning Phase"; all 36 implementation checklist items unchecked | Dec 2025; no update rule |
| OIDC implementation plan | `OIDC_IMPLEMENTATION.md` | Auth design, code stubs | Stale — says "Implementation: Not Started" but is implemented | Jan 2026; no update rule |
| Multi-tenant plan | `painchain/backend/MULTI_TENANT_IMPLEMENTATION.md` | Tenancy model, code stubs | Stale — says "Ready to Implement" but is implemented | Jan 2026 |
| Frontend auth plan | `painchain/frontend/FRONTEND_AUTH_PLAN.md` | Frontend auth phases, code stubs | Partially stale — marks backend complete; frontend auth partially done | Jan 2026 |
| OIDC configuration guide | `painchain/backend/src/auth/OIDC_CONFIGURATION.md` | How to configure OIDC providers | Current — accurate for the implemented system | Unknown |
| AI/agent rules | `docs/contributing/CLAUDE.md` | Claude Code contributor rules | Stale — references pytest, pre-commit (not used) | No update rule |
| Connector build guide | `docs/contributing/CONNECTOR_GUIDE.md` | How to build a new connector | Appears current | Unknown |
| Release process | `docs/contributing/RELEASE.md` | Release checklist and process | Stale — describes v1 architecture (FastAPI, Celery, Redis, nginx) | Unknown |
| Frontend README | `painchain/frontend/README.md` | Vite template boilerplate | Stale — Vite template default, not project-specific | Template |
| GitHub connector docs | `connectors/github/README.md` | How to configure and run connector | Current and detailed | Unknown |
| GitLab connector docs | `connectors/gitlab/README.md` | Same for GitLab | Current | Unknown |
| Kubernetes connector docs | `connectors/kubernetes/README.md` | Same for K8s | Current | Unknown |
| Feature registry | `features.json` | Feature list with descriptions | Stale — describes v1 FastAPI/Celery stack | No owner |
| Environment template | `.env.example` | Required environment variables | Partial — short; missing JWT_SECRET, APP_URL, FRONTEND_URL | Unknown |

### Central Organization And Sprawl

| Area | Evidence | Assessment |
|------|----------|------------|
| Entry point / index | `README.md` | Exists but stale; no cross-links to `ARCHITECTURE.md` or operational docs |
| Planning docs vs. operational docs | `OIDC_IMPLEMENTATION.md`, `MULTI_TENANT_IMPLEMENTATION.md`, `FRONTEND_AUTH_PLAN.md` | Planning docs left in root/source dirs after implementation; no archive or status update |
| Duplicated content | `OIDC_IMPLEMENTATION.md` (1,355 lines) and `OIDC_CONFIGURATION.md` (448 lines) both describe OIDC setup | Overlapping scope; `CONFIGURATION.md` is accurate; `IMPLEMENTATION.md` is stale |
| Doc location consistency | Implementation plans in root, `backend/`, and `frontend/`; connector guides in `connectors/`; contributing docs in `docs/contributing/` | No location pattern: plans scattered by author preference |
| Cross-links | README → ARCHITECTURE.md only; no other cross-links | Navigating from README to operational docs requires knowing file names |
| Archive / deprecation | None | No pattern for marking docs as superseded or moving them to an archive |

### Context And Decision Records

| Context/decision | Location | Explains why? | Current status |
|------------------|----------|---------------|----------------|
| v2 architecture rationale | `ARCHITECTURE.md` | Yes — connector-independence, self-registration, free/SaaS tier model | Accepted; document says "Planning Phase" but system is built |
| OIDC design and flow | `OIDC_IMPLEMENTATION.md` | Yes — detailed state machine, security rationale | Superseded — document describes intent, not what was built |
| Multi-tenant isolation model | `painchain/backend/MULTI_TENANT_IMPLEMENTATION.md` | Yes — explains why tenant-scoped guards exist | Partially — "Ready to Implement" but implemented; `@Public()` bypass not documented |
| `@Public()` decorator policy | None | No — no doc explains when it is safe vs. unsafe | Not recorded anywhere |
| Why `prisma db push` vs. migrate | None | No | Not recorded; a new engineer would not know this is a deliberate choice or a gap |
| JWT in URL (OIDC callback) pattern | None | No | Security-relevant; not documented as a known tradeoff |
| Decision not to use a queue | None | No | Architecture rationale for synchronous connector→backend HTTP not written down |

### Runbooks And Operations

| Workflow | Runbook evidence | Usability |
|----------|------------------|-----------|
| Local development setup | `README.md` (Quick Start — "Coming Soon") | Missing — no working instructions |
| Docker Compose deploy | `RELEASE.md` Step 1 (stale v1 commands) | Stale and partial |
| Rollback | `RELEASE.md` "Rollback" section (pin to old image tag) | Partial — ignores DB schema implications |
| Schema migration | None | Missing — no instructions for `prisma db push` vs. `prisma migrate` |
| Secret rotation | None | Missing |
| Incident response | None | Missing |
| Database restore | None | Missing |
| Adding a new connector | `docs/contributing/CONNECTOR_GUIDE.md` | Current and detailed — best runbook in the repo |
| OIDC provider configuration | `painchain/backend/src/auth/OIDC_CONFIGURATION.md` | Current and usable |

### AI And Agent Context Docs

| File/skill/rule | Purpose | Update mechanism | Risk |
|-----------------|---------|------------------|------|
| `docs/contributing/CLAUDE.md` | Claude Code contributor rules | None documented | High — references pytest, pre-commit (not used); no stack-specific guidance; no multi-tenant rule; no `@Public()` policy |
| `.claude/settings.local.json` | Claude Code tool permissions | Manual (in .env equivalent) | Critical — tracked in git with JWT token in allow list (raised in security/AI-engineering audits) |

## Findings

### Main README Says "Planning Phase" and "Coming Soon" — The System Is Built

**Severity:** High
**Category:** Freshness / Handoff
**Location:** `README.md:3,76`

The README's status section states "Phase: Planning and Architecture Design" with Next Steps describing "Set up core backend (NestJS + Prisma)" and "Build first connector (GitHub)." The Quick Start section reads: "Once the new architecture is implemented, you'll be able to run PainChain with: `docker-compose up -d`". In fact, v2 is fully operational: NestJS backend with auth, multi-tenant RBAC, OIDC, three connectors, and a React frontend are all running via `docker-compose up`. Any new contributor — human or AI agent — reading the README would conclude the project is in planning, when it is a functional MVP with security-critical code that needs review.

**Recommendation:** Update the README status section to reflect v2 completion: remove the "Planning Phase" header, replace the "Coming Soon" Quick Start with actual working commands (`cp .env.example .env && docker-compose up -d`), list the actual implemented features, and note the current development state (MVP, security gaps being addressed, tests needed). The existing architecture section can remain as a design reference with a link to `ARCHITECTURE.md`.

---

### Three Large Implementation Plans Describe Unstarted Work That Is Already Done

**Severity:** High
**Category:** Stale Docs / False Context
**Location:** `OIDC_IMPLEMENTATION.md:3`, `painchain/backend/MULTI_TENANT_IMPLEMENTATION.md:5`, `painchain/frontend/FRONTEND_AUTH_PLAN.md:3`

Three planning documents totaling 4,837 lines retain their pre-implementation status headers after the code was written:
- `OIDC_IMPLEMENTATION.md`: "Status: Planning Complete ✅ | Implementation: Not Started" (OIDC is implemented)
- `MULTI_TENANT_IMPLEMENTATION.md`: "Status: Ready to Implement" (multi-tenant is implemented)
- `FRONTEND_AUTH_PLAN.md`: "Status: Ready for Implementation" with many unchecked `[ ]` items (some implemented, some not)

These documents also contain code stubs and examples that may or may not match the final implementation. An AI agent reading `OIDC_IMPLEMENTATION.md` today would think it needs to "Step 3: Implement the OIDC callback" — which was already done in commit `4a5a884`. The AI might regenerate the callback implementation, overwriting the existing one.

`ARCHITECTURE.md` has the same problem: "Status: Planning Phase" at the top and 36 unchecked `[ ]` implementation checklist items, all of which have been built.

**Recommendation:** For each document: (1) Update the status header to `Status: Implemented — see commit <sha>`. (2) Move the document to `docs/design/` or `docs/archive/`. (3) Add a one-line note at the top of each implementation plan: "This document described the design intent. The implemented system may differ. See source code for the actual implementation." For `ARCHITECTURE.md`, update the status and check off completed items or convert unchecked items to known gaps.

---

### `features.json` Describes V1 Architecture — Agent Context Is Factually Wrong

**Severity:** High
**Category:** Stale Context / AI Safety
**Location:** `features.json`

`features.json` lists `"rest_api": "Read-only FastAPI service with filtering and statistics endpoints"` and `"react_dashboard"` as features of the current system. The v2 system has no FastAPI backend and no embedded connector code — it runs NestJS + Prisma. The `docs/contributing/CLAUDE.md` instructs AI agents to "add every new feature to features.json with a clear description and version tag." If an agent reads this instruction and then reads `features.json` for context, it would understand the system as a FastAPI/Celery/Redis application — fundamentally incorrect.

**Recommendation:** Either update `features.json` to reflect v2 features (NestJS backend, JWT+OIDC auth, multi-tenant RBAC, connector containers, Docker Compose deployment) or delete it and remove the instruction from `CLAUDE.md`. If a feature registry is valuable, a short v2 version with current features is worth maintaining. The v1 entries should be removed entirely or annotated `"deprecated": true`.

---

### `CLAUDE.md` Gives No Project-Specific Guidance For the AI's Primary Development Role

**Severity:** High
**Category:** AI Context Quality
**Location:** `docs/contributing/CLAUDE.md`

The file that most directly guides Claude Code's behavior contains 8 generic rules applicable to any project and two false references (`pytest`, `pre-commit` — neither configured). It provides no guidance on: the NestJS module pattern and where new routes go; the multi-tenant isolation invariant (every data query must scope by `tenantId`); the `@Public()` decorator policy (when it is safe to use and when it is not); the `ValidationPipe` requirement; or `prisma migrate dev` vs. `prisma db push`. These are the invariants most likely to be broken by an AI agent making changes without project-specific context.

The file also has no update mechanism — nothing tells the agent to update it when the project changes, or tells a human when it needs review.

**Recommendation:** Replace `docs/contributing/CLAUDE.md` with a root-level `CLAUDE.md` (so Claude Code discovers it automatically) containing: (1) the stack (NestJS 11 + Prisma 7 + PostgreSQL + React); (2) the multi-tenant isolation rule ("every Prisma query on user-owned data must include `tenantId` in the `where` clause"); (3) the `@Public()` rule ("only for anonymous public endpoints — never on data endpoints"); (4) the `ValidationPipe` requirement ("always required on new routes"); (5) migration rule ("use `prisma migrate dev` — never `prisma db push` in production"); and (6) an update trigger ("when adding a new module, update this file with the module name and its invariants").

---

### Frontend README Is a Vite Template — Not Project Documentation

**Severity:** Medium
**Category:** Documentation Quality
**Location:** `painchain/frontend/README.md`

The frontend README is the default Vite template README, describing "two official plugins" for React HMR and how to configure ESLint type-aware rules. It contains no information about PainChain's frontend architecture, the pages and components that exist, how to run the frontend in development, how it connects to the backend, or any project-specific context.

**Recommendation:** Replace the template README with a brief project-specific README: purpose of the frontend, `npm run dev` command, required environment variables (`VITE_API_URL`), the page structure (Home/Timeline, Integrations), the auth flow, and a note that the frontend is served by the backend in production (so the build output is served from `frontend/dist`).

---

### No Operational Runbooks — Common Tasks Have No Documented Procedure

**Severity:** Medium
**Category:** Operational Docs
**Location:** `docs/contributing/`

There are no runbooks for: local development setup (the README Quick Start is "Coming Soon"), database restore from a backup, secret rotation (rotating the JWT secret, rotating DB password), responding to a downed container, adding an OIDC provider to an existing deployment, or diagnosing why events are missing from the timeline. The connector READMEs and `OIDC_CONFIGURATION.md` come closest to being operational guides, but there is no general operational playbook.

**Recommendation:** Add a `docs/ops/` folder with at minimum: a `setup.md` (working local dev commands), a `secrets.md` (how to rotate JWT secret and DB password without breaking active sessions), and a `debugging.md` (how to check connector health, why events might be missing, how to query the database directly). These can be brief — a few bullet points per topic is more useful than nothing.

---

### `.env.example` Is Incomplete — Missing Variables Used by the Application

**Severity:** Medium
**Category:** Setup Documentation
**Location:** `.env.example`

The `.env.example` file documents `DB_PASSWORD`, `DATABASE_URL`, and `GITHUB_POLLING_INTERVAL` but does not document `JWT_SECRET`, `JWT_EXPIRES_IN`, `APP_URL`, `FRONTEND_URL`, `BASIC_AUTH_ENABLED`, `ALLOW_REGISTRATION`, or `OIDC_PROVIDERS` — all of which are read by the backend. A developer setting up from `.env.example` would have a working database connection but no JWT signing key, meaning the auth system would fall back to `'fallback-secret'` (the hardcoded default in `oidc.service.ts`). This is a security-setup documentation gap.

**Recommendation:** Add all environment variables consumed by the application to `.env.example`, with placeholders, descriptions, and security notes. At minimum: `JWT_SECRET=<generate with: openssl rand -base64 32>`, `JWT_EXPIRES_IN=7d`, `APP_URL=http://localhost:8000`, `FRONTEND_URL=http://localhost:8000`, `ALLOW_REGISTRATION=true`, and commented OIDC_PROVIDERS examples.

---

## Score

**Section score:** 3 / 10

There is significant documentation effort visible — detailed connector READMEs, a thorough connector build guide, and a usable OIDC configuration guide — but the documentation most likely to be read (README, ARCHITECTURE.md, CLAUDE.md, features.json) is inaccurate in ways that would mislead a new contributor or AI agent. The planning documents describe a system that doesn't exist yet; the actual system has no description. The most critical operational invariant — multi-tenant data isolation — is not documented anywhere outside of the implementation plan's code stubs. There are no runbooks, no working Quick Start, and the AI agent context file is a set of generic rules that won't guide the agent away from breaking the multi-tenant model or misusing `@Public()`.

## Recommendations Summary

- [ ] Update `README.md` to reflect v2 completion: remove "Planning Phase" status, replace "Coming Soon" Quick Start with working `docker-compose` commands, list implemented features
- [ ] Mark all three implementation plan docs as implemented (`Status: Implemented — see commit X`), move to `docs/design/`, and add a note that the source code is authoritative
- [ ] Replace `docs/contributing/CLAUDE.md` with a root-level `CLAUDE.md` containing stack overview, multi-tenant isolation rule, `@Public()` policy, ValidationPipe requirement, and migration rule
- [ ] Update `features.json` to reflect v2 (NestJS, OIDC auth, multi-tenant connectors) or delete it and remove the instruction from CLAUDE.md
- [ ] Add all environment variables to `.env.example` and create a minimal `docs/ops/setup.md` with working local dev commands
