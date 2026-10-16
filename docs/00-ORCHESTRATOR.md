# 00 — Orchestrator Operating Contract

**Project:** Weekend E-Commerce MVP  
**Status:** Execution specification  
**Owner:** Orchestrator / Tech Lead  
**Time budget:** Target 16 elapsed hours; hard cap of one weekend (maximum 20 focused execution hours, with a final 2-hour stabilization buffer).  
**Workers:** Four specialist subagents: Backend, Frontend, DevOps, QA & Documentation.  
**Primary outcome:** A reviewer can clone the repository, follow `README.md`, run the application with Docker Compose, import/seed products from the supplied CSV, manage/search products, and complete a simulated purchase through a functional UI.

> This file governs the execution process. Product, architecture, backend, API, frontend, infrastructure, and quality definitions supply implementation details. If a downstream definition conflicts with this contract's time/scope limits, prioritize mandatory user requirements and escalate the contradiction; do not silently expand scope.

## 1. Mission and success criteria

Build a maintainable, demonstrable **MVP**, not a production commerce platform. Apply enterprise engineering discipline to the **boundaries, validation, data integrity, reproducibility, testing, and documentation**, not to speculative infrastructure or unnecessary abstractions.

**Required deliverables (no feature may be dropped):**

1. Product CRUD: create, read/list, update, delete through backend endpoints **and** admin UI.
2. CSV product import via backend and admin UI, with validation and visible error reporting.
3. SQLite database, schema migrations, and an idempotent seed process using the supplied CSV.
4. Product search from the storefront UI backed by the Symfony API.
5. Product catalog and responsive storefront inspired by the supplied landing-page reference.
6. Cart and end-to-end checkout that creates an order, fakes payment, and updates stock correctly.
7. Next.js/React frontend using TypeScript, Tailwind CSS and a pinned, compatible current daisyUI version.
8. PHP/Symfony backend, with Doctrine/SQLite and clear domain/application/API boundaries.
9. Independent frontend and backend Docker containers, orchestrated with Docker Compose, with persistent SQLite storage.
10. README with decisions, approach, alternatives considered, test instructions, and reproducible local setup.

**MVP quality floor:** server-side validation; unique SKU; safe money representation; deterministic CSV behavior; no negative inventory; authoritative server-side prices; transactional checkout; stable API error responses; basic admin protection; meaningful smoke/integration tests; no manual, undocumented setup steps.

**Not required:** real payment gateway, customer accounts, shipping or tax engines, discounts, order emails, queues, external search, distributed systems, multi-tenancy, product reviews, analytics, elaborate role-based access, or deployment to cloud.

## 2. Source of truth and precedence

Read these in order before assigning development tasks:

1. User's original requirements and attached assets (CSV and landing-page mock).
2. `00-ORCHESTRATOR.md` (this file): execution constraints and coordination.
3. `01-PRODUCT.md`: behavior and acceptance criteria.
4. `02-ARCHITECTURE.md`: technical boundaries and schema.
5. `04-API.md`: versioned request/response contract. **Freeze before concurrent feature implementation.**
6. `03-BACKEND.md`, `05-FRONTEND.md`, `06-INFRASTRUCTURE.md`, `07-QUALITY.md`: agent implementation guides.

If any referenced specification is missing, have the orchestrator create a **short, explicit contract or placeholder decision** before dependent work. Do not wait for beautifully detailed documents. Record deviations in `docs/decisions.md` and communicate them to affected agents. If a change alters a public API or a shared data shape, require orchestrator approval and synchronized updates to dependent consumers/tests.

Use original CSV as a seed input, not as a trusted database backup. Its columns are `name,sku,description,category,price,stock,weight_kg`. The supplied mock is a **visual reference**, not proof that CSV products are all kitchenware. Avoid fabricated product metadata and use local placeholders for missing imagery.

## 3. Agent roster and authority

| Role | Accountable for | Primary owned paths | Must not change without approval |
|---|---|---|---|
| **Orchestrator / Tech Lead** | Work breakdown, contracts, prioritization, integration, cross-cutting decisions, final review | `docs/`, `00-ORCHESTRATOR.md`, shared contracts, task board | Agent-owned implementation files except at a documented integration handoff |
| **Backend Agent** | Symfony API, SQLite models/migrations, CRUD, search, CSV import/seed, transactional orders, fake payment | `apps/api/**` | `apps/web/**`, root Docker/CI configuration |
| **Frontend Agent** | Storefront, catalog/search, cart/checkout UI, admin CRUD/import, design system | `apps/web/**` | `apps/api/**`, root Docker/CI configuration |
| **DevOps Agent** | Dockerfiles in coordination with app owners, Compose, persisted volume, setup scripts, runtime configuration | `compose.yaml`, `infra/**`, root `.env.example`, `Makefile`, root automation/CI | Backend business logic, frontend pages, schema/API contract |
| **QA & Documentation Agent** | Acceptance matrix, test review, smoke tests, README, decisions/trade-offs documentation | `README.md`, `docs/qa/**`, `scripts/smoke/**`, optionally `tests/e2e/**` | Feature code unless given a narrowly scoped bug ticket |

**Shared-path exception:** `apps/api/Dockerfile` and `apps/web/Dockerfile` are written by DevOps, but owners must review runtime requirements before merge. The orchestrator owns changes to lockfiles/contracts when two agents need the same file. Existing project conventions take priority over this path map if approved and recorded.

An orchestrator may execute validation commands and make tiny merge-conflict resolutions but **must not become an untracked fifth feature developer**. Spawn a bounded subtask for substantial changes.

## 4. Task model and delegation protocol

Break work into **small, verifiable tasks**, usually 30–90 minutes each. Every task assignment MUST include:

```yaml
id: BE-03
phase: 3
title: Product CRUD endpoints
owner: Backend Agent
objective: Create validated product CRUD API operations.
owned_paths: ["apps/api/**"]
dependencies: ["ARCH-02", "API-01", "BE-01"]
inputs: ["01-PRODUCT.md", "02-ARCHITECTURE.md", "04-API.md"]
acceptance:
  - "Unique SKU enforced at database and API levels"
  - "Invalid payloads return documented 4xx errors"
validation:
  - "<real command for backend test suite>"
  - "<real API smoke command>"
output: "Commit/branch, changed files, tests/results, risks, handoff notes"
priority: P0
```

Replace placeholder commands with project-specific commands as scaffolding becomes available. Tasks with unclear dependencies or acceptance checks **must be clarified before assignment**.

**Task lifecycle:** `BACKLOG → READY → IN_PROGRESS → REVIEW → DONE` or `BLOCKED`. One named owner per task. The orchestrator tracks tasks in `docs/task-board.md` (or equivalent issue tracker), with dependencies, phase, status, and links to commits. Limit work in progress to **one primary task per worker**. When blocked, report the exact blocker, attempted resolution, and requested decision; the orchestrator reassigns nondependent tasks rather than allowing idle agents.

**Required agent completion handoff:** task ID; summary; changed paths; commands run and observed results; screenshots when UI matters; known limitations; API/schema changes; commit hash or branch; next dependency unlocked. An unsupported “done” is not accepted.

## 5. Branching, ownership and merge policy

- Use **one Git worktree/branch per agent**, named `agent/backend`, `agent/frontend`, `agent/devops`, `agent/qa` (or equivalent isolated branches).
- Orchestrator manages `main` and integrates **small, passing increments**; do not wait until the final phase to merge.
- No two agents edit the same file in parallel. Shared contract files are locked by the orchestrator during edits.
- No destructive resets, force pushes to shared branches, or silent deletion of other agents' work.
- Commit scoped changes and include task IDs. Before merge: lint/build/test relevant changes; orchestrator checks diff and integration impact.
- When conflicts arise: pause affected merge, choose one authoritative contract, instruct owner to rebase/adjust, rerun tests; never resolve conflicts by guessing API behavior.
- If the orchestration runtime has no Git worktree support, serialize changes to shared files and retain the ownership table; do not assume true file isolation.

## 6. Six phases, concurrency and gates

**Time allocations are elapsed execution targets, not person-hours.** Agents may work concurrently once prerequisites are approved. Phases 3 and 4 overlap substantially; QA begins as soon as the first testable slice exists.

| Phase | Target elapsed time | Lead | Parallel work | Exit gate |
|---|---:|---|---|---|
| **1. Specifications & Contracts** | 1.5h | Orchestrator | QA drafts acceptance cases; others review feasibility | Minimal product rules, schema and API contract agreed; tasks assigned; no unresolved P0 ambiguity |
| **2. Project Foundation** | 2h | DevOps | Backend scaffolds Symfony; Frontend scaffolds Next.js; QA sets smoke plan | `docker compose up --build` starts frontend and backend; health endpoint reachable; SQLite volume persists |
| **3. Core Backend** | 3.5h | Backend | Frontend begins mock-driven UI on frozen contract; QA writes API tests | CRUD, CSV seed/import, search and checkout endpoints run; core backend tests pass |
| **4. Frontend Experiences** | 4h | Frontend | Backend stabilizes API; DevOps hardens Compose; QA reviews journeys | Storefront, search, cart, checkout, admin CRUD/import reachable; responsive UI; no permanently mocked checkout |
| **5. Integration & Quality** | 3h | QA + Orchestrator | Agents fix defects only in owned paths | Real UI-to-API flows pass; invalid CSV and stock-edge cases verified; persistence checked |
| **6. Documentation & Delivery** | 2h | QA + Orchestrator | DevOps reruns cold-start setup; agents fix blockers | README complete; fresh clone/build/start/seed/test reproducible; all P0 acceptance checks green |

**Total target: ~16 hours** (rounding intentional). Preserve **2 hours of stabilization capacity**, keeping hard weekend execution under ~20 hours. If progress is slower, simplify implementations, not mandatory features.

### Dependencies and parallelism

```text
Phase 1: Product rules + DB schema + API v1 contract (freeze)
    ↓
Phase 2: DevOps Compose ─┬─ Backend scaffold + migrations
                        └─ Frontend scaffold + theme
    ↓
Phase 3: Backend CRUD/import/search/order ───────┐
Phase 4: Frontend catalog/admin/cart/checkout ───┼─ Integration slices
QA: tests, acceptance review, README draft ──────┘
    ↓
Phase 5: E2E checks + defect fixes
    ↓
Phase 6: Clean-room Docker verification + final README
```

**Preferred integration slices:** (1) health + product list → (2) CRUD/admin → (3) CSV import UI → (4) search → (5) cart + fake checkout. Merge slices as soon as contracts and tests pass. Do not defer frontend/backend integration until Phase 5.

## 7. Contract decisions that must be settled in Phase 1

The orchestrator must record these decisions before the relevant feature begins:

- **Money:** represent internal prices as integer cents/minor units; explicitly define API price fields and rounding/formatting; never use floating-point arithmetic for final order totals.
- **SKU:** required and unique; specify normalization/case policy. Database unique constraint is mandatory.
- **Product deletion:** choose soft vs hard delete; define consequences for existing order line items. Keep order-item purchase snapshots.
- **Category:** accept seed categories deterministically (category table or normalized string); do not use a rigid enum that rejects legitimate CSV categories.
- **CSV:** header validation, trimming/parsing, required fields, nonnegative integral stock, valid positive price, nonnegative weight, duplicate SKU policy, row errors, repeatable seed; define whether partial import is permitted (recommend valid rows imported, invalid rows reported, with explicit summary).
- **Search:** supported query/filter/sort/pagination and response envelope; start with indexed SQLite queries, no external service.
- **Orders:** clear lifecycle (`pending → paid` or `failed`), fake payment result, transaction boundaries, idempotency/replay handling, and when stock is deducted. Server recalculates totals and rejects insufficient stock.
- **Admin protection:** choose a minimal, documented authentication approach that protects mutation and import operations; keep secrets in environment variables, never commit credentials.
- **Images:** local curated assets or deterministic placeholders for products lacking image URLs.
- **API:** define `/api/v1` paths, JSON fields, errors and pagination in `04-API.md`; frontend can use typed mocks until API is ready, but mocks must be removed for mandatory flows at acceptance.

Avoid gold-plating: do not add generic repositories for every entity, a job queue for small CSV files, event sourcing, a custom design system framework, or a standalone auth service.

## 8. Validation gates and evidence

**Gate A — Contract-ready (Phase 1):** all P0 stories have acceptance criteria; API shapes and data invariants are frozen; each task has an owner and dependency.

**Gate B — Bootable (Phase 2):** a clean `docker compose up --build` works using documented configuration; frontend and API are accessible; SQLite file is on a mounted persistent volume; migration and seeding commands are executable without host PHP/Node.

**Gate C — Backend-ready (Phase 3):** product create/update/delete/read, CSV import and idempotent seeding, search, order creation and fake payment tested; malformed inputs fail predictably; stock remains valid; duplicate SKU conflicts handled.

**Gate D — UI-ready (Phase 4):** user can browse, search, add/remove cart items, checkout and see confirmation; administrator can create/edit/delete products and upload a CSV; all actions use real API endpoints; reasonable mobile layout, loading/empty/error states.

**Gate E — Integrated (Phase 5):** at minimum verify:

1. Seed CSV: valid rows imported; bad rows reported with line/reason; second seed does not create duplicates.
2. CRUD: create, edit, search, delete; duplicate SKU rejected.
3. Search: free-text and pagination; zero-results behavior.
4. Checkout: purchase in-stock item; order total and purchased snapshots correct; stock decreases exactly once.
5. Insufficient stock and repeat payment: no oversell, duplicate stock deduction or duplicate paid order.
6. Docker restart: SQLite data persists; both services recover.
7. Admin requests without valid credentials fail.
8. Frontend builds; backend tests pass; at least one scripted browser or HTTP end-to-end smoke flow passes.

**Gate F — Deliverable (Phase 6):** README includes overview, architecture diagram or explanation, prerequisites, environment variables, exact local commands, seeding/reset commands, usage walkthrough, test commands, design decisions, alternatives, known limitations, and troubleshooting. Cold-start procedure is verified on a clean environment. No undocumented shell steps.

**Evidence standard:** record exact commands and **actual exit results**, not assumed success; attach relevant logs/test summaries in `docs/qa/verification.md`. If a gate cannot be verified because Docker or another tool is unavailable, mark it **NOT VERIFIED**, document the limitation, and do not claim it passed.

## 9. Weekend triage and escalation policy

Classify work:

- **P0 — Required:** every user-mandated feature plus correctness/security necessary to make it work reliably. P0 blocks final completion.
- **P1 — Quality:** sensible responsive polish, extra integration tests, better import preview, richer error messages. Do when budget permits.
- **P2 — Optional:** animations, advanced filters, elaborate dashboards, infrastructure optimization. Do not start until all P0 work is green.

**At 50% of elapsed budget (~8h):** orchestrator checks for a complete vertical slice (product list + working API + Docker). If missing, reduce polish, narrow abstractions, and pull agents toward integration.

**At 75% (~12h):** feature freeze except unresolved P0 requirements. Agents stop adding extras and prioritize connected checkout, import reliability and admin flows.

**At 90% (~14–15h):** stabilization only: tests, runtime fixes, README, and reproducibility. Drop remaining P1/P2 tasks.

**Blocking protocol:** after ~15 minutes of blocked effort, agent files a blocker with severity, failing command/trace, impacted gate, and 1–2 options; orchestrator decides promptly. If an external package or library issue cannot be resolved quickly, select the simplest compatible substitute **without violating explicit technology requirements**. Never swap Next.js, Symfony, SQLite, or daisyUI out silently.

## 10. Operational loop (execute until delivery)

1. **Discover:** inspect repository and inputs; read specs, CSV header, reference image; report missing artifacts or ambiguities.
2. **Plan:** populate task board with IDs, owners, dependencies, estimated effort, gates and P0/P1 priority.
3. **Freeze interfaces:** publish minimal schema and API contract; announce revisions explicitly.
4. **Delegate:** assign ready tasks to workers with bounded scope and paths; allow independent tasks in parallel.
5. **Check progress:** on each agent handoff (or roughly every 60–90 minutes), update status, blockers, time spent and the next critical path.
6. **Verify + merge:** review diffs and actual tests, resolve contracts, merge small increments, run integration smoke tests.
7. **Triage:** reprioritize based on remaining time; do not cut a mandatory feature to save optional polish.
8. **Stabilize:** require fresh Docker startup, database seed, CRUD/search/checkout demo and test evidence.
9. **Deliver:** summarize functionality, startup commands, passing/failed checks, known limitations and remaining non-blocking work honestly.

If the orchestration environment cannot truly spawn subagents, run the same work packages sequentially or with available task delegation; do not claim parallel execution that did not occur.

## 11. Handoff templates

### Agent → Orchestrator

```markdown
### Handoff: [TASK-ID] — [Title]
- Status: DONE | BLOCKED | REVIEW
- Branch / commit:
- Files changed:
- Implemented behavior:
- API/schema/contract changes: none | details
- Commands run and results:
- Manual validation:
- Known issues / limitations:
- Dependencies unlocked / help needed:
```

### Orchestrator → Agent

```markdown
### Assignment: [TASK-ID] — [Title]
- Priority / deadline:
- Objective and acceptance criteria:
- Allowed files:
- Forbidden/shared files:
- References and frozen interfaces:
- Dependencies already satisfied:
- Required tests and proof:
- Expected handoff format:
```

### Phase gate report

```markdown
## Gate [A–F] — [Name]
- Status: PASS | FAIL | NOT VERIFIED
- Elapsed time / remaining budget:
- Evidence (commands, logs, tests, screenshots):
- P0 issues:
- Owner and action for each issue:
- Decision to advance or hold:
```

## 12. Final orchestrator acceptance / stop conditions

**Stop successfully only when** all ten mandatory deliverables in Section 1 are demonstrated, Gate F is PASS, and no P0 issues remain. The final summary must distinguish completed, partially complete, unverified, and intentionally omitted work.

If the weekend budget is exhausted with unresolved P0 issues, **stop honestly**: report what works, the exact blockers, and the minimal remaining fixes. Never invent passing tests, replace the backend with mock data while claiming completion, conceal rejected CSV rows, or claim Docker support without executable configuration.

**First execution instruction:** inspect the repository, create `docs/task-board.md`, confirm source assets and specs, freeze the initial database/API contracts, and delegate Phase 2 scaffolding to the four specialist agents as soon as dependencies allow.
