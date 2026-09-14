# Agent Guidelines

## Convention Preferences
Upon conversation initialization, execute skill /org-mode-conventions. All persistent documents, specifications, research reports, ADRs, and issue tickets MUST be native Org-mode (.org) files. When any skill refers to a .md document (e.g. `CONTEXT.md`, `spec.md`, `map.md`), substitute the .org equivalent (`CONTEXT.org`, `spec.org`, `map.org`).

## Org-Mode Source Block Formatting
- **Source Block Delimiters**: `#+BEGIN_SRC` and `#+END_SRC` block delimiters MUST ALWAYS be placed on their own line and start at the absolute beginning of that line (column 0, zero indentation). Never indent `#+BEGIN_SRC` or `#+END_SRC` within lists, quote blocks, or subheadings.

## Math & LaTeX Formatting
Format mathematical notation using vanilla Org-mode syntax:
- General equations and variables do not require `$...$` or `\(...\)` delimiters unless creating centered display equations via `\begin{equation}...\end{equation}`.
- Use LaTeX Greek symbols in ASCII syntax (`\lambda` for lowercase, `\Lambda` for uppercase; `\sigma`, `\Sigma`, `\tau`, `\mu`, `\alpha`, `\beta`, `\Delta`, `\Omega`, `\epsilon`) rather than literal unicode glyphs for maximum portability and human readability.

## Agent Skills & Tracking Locations
- **Issue Tracker**: Local org-mode files under `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.org`.
- **Domain Docs**: Single-context (`CONTEXT.org` at repo root, `docs/adr/` for ADRs). See `docs/agents/domain.org`.

## Operational & Filesystem Boundaries
- **Strict Respect for `.gitignore` and `.agentignore`**: Agents MUST strictly honor `.gitignore` and `.agentignore` files at all times without exception:
  - *Tool Invocation Restrictions*: Agents must never run commands with flags that bypass ignore rules (e.g. `rg -u`, `rg --no-ignore`, `fd -I`, or unpruned `find`).
  - *Output Reference Invariant*: If any bash command output (compiler logs, git diffs, build traces, test dumps, error backtraces) mentions or prints a path matching `.gitignore` or `.agentignore` (such as `docs/plans-*/`, `.scratch/`, `.archive/`, build artifacts), agents are STRICTLY FORBIDDEN from searching, inspecting, viewing (`view_file`), or modifying those paths unless explicitly instructed by the user. Mention in command output does NOT grant permission to traverse.
  - *Prohibition on Ignored Planning Directories*: Never list, search, inspect, or modify files within `docs/plans-*/` or any `.gitignore`'d planning folders. These directories contain obsolete scratch materials and are ignored by design.
  - *Authorized Planning & Issue Locations*: Authoritative specifications and roadmaps reside strictly in `docs/` (`docs/roadmap.org`, `docs/phase-3_meta-plan.org`, `docs/test-design.org`). Local feature issue trackers reside in `.scratch/<feature>/` (e.g. `.scratch/duck-ai-adapter/`, `.scratch/technical-debt/`).

## Sequential Thinking & Reasoning (`seq/thinking` MCP)
When conducting step-by-step reasoning or deep analysis using the `seq/thinking` MCP tool (`seq:think`, replacing `sequentialthinking`):
- **Step Number & Descriptive Purpose Labeling**: Every thinking step MUST be explicitly labeled with the step number followed by a concise, descriptive purpose of the thinking step (e.g., `Step N: [Descriptive Purpose of Step]`). This rule applies across all three locations:
  1. `toolSummary` (e.g. `Step 1: Test AST parsing design`)
  2. `toolAction` (e.g. `Step 1: Analyzing test AST parser and discovery`)
  3. The very start of the `thought` content itself (e.g. `Step 1: Analyzing test AST parser and discovery...`)
  Never use generic placeholders (such as "Thinking", "Next thought", or just "Step N") lacking the specific facet, hypothesis, or subsystem being analyzed.
- **Dynamic Depth Calibration**: Calibrate thought depth dynamically based on task complexity (typically between 4 and 32 steps) rather than forcing a rigid count:
  - **Focused checks / single-seam refactors**: 4–8 thoughts.
  - **Architectural design / standard research**: 10–16 thoughts.
  - **Complex migrations / subtle async flows / deep algorithms**: 18–32 thoughts.

## Preact UI & Architecture Guidelines
- **Standard Deno Compiler Options**: The correct compiler options for Deno with Preact are: `"compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "preact" }`
- **Declarative Preact-First UI**: All extension UI views (HUDs, badges, toolbars, overlays, code block containers, rendered views) MUST be implemented as declarative Preact components using JSX. Never import `h` in `.tsx` files. Inside Preact components, never use raw `document.createElement`, manual `.style.display` mutation, or disjoint `render()` calls for UI composition. Never directly modify `.innerHTML`.
- **Preact Portals for Local Overlays**: Preact portals (`createPortal`) are used strictly within a component tree to project overlays, flyouts, or toolbars to escape local CSS overflow clipping (`overflow: hidden`) within that same ShadowRoot boundary. Portals must never be used across disjoint host DOM nodes or across separate ShadowRoots.
- **Authorized Host DOM In-Situ Mount Anchors**: Low-level host DOM injectors (`src/features/chats/*/injector.tsx`, `src/views/settings/hudMount.tsx`) are the authorized bridge between third-party host DOMs and Preact:
  - Injectors are explicitly permitted and required to create sibling wrapper containers (`document.createElement("div")`), insert them adjacent to host nodes, hide native elements via `style.display = "none"` (preserving the unmutated Data-Island), attach isolated open ShadowRoots (`attachShadow({ mode: "open" })`), adopt shared stylesheets (`shadowRoot.adoptedStyleSheets = [...]`), and call `render(<Component />, shadowRoot)`.
  - **One Preact Root per ShadowRoot Anchor**: Each host mounting anchor attaches an isolated ShadowRoot and mounts exactly one Preact root (`render(<Component />, shadowRoot)`). Never instantiate multiple disjoint Preact roots within the same ShadowRoot.
  - **Idempotent Teardown**: Adapters must provide an idempotent `destroy()` method that executes `render(null, shadowRoot)`, removes injected sibling containers from the host DOM, and restores native host element visibility.
- **Build Destination Policy**:
  - Development (`dist/dev/` via `deno task build:dev`): Default target for all active development and automated workflows.
  - Release (`dist/release/` via `deno task build`): Only run upon explicit user request.

## Code Formatting Policy
- **Format In-Place Rather than Checking**: Never run `deno fmt --check`. Always apply formatting directly in-place with `deno fmt`.
- **Silent Formatting Output**: Discard `deno fmt` output to null (`deno fmt > /dev/null 2>&1`) to avoid polluting execution logs.

## Software Engineering & Design Principles
- **SOLID, DRY, Encapsulated Modules with Well-Defined Interfaces**: Code written MUST follow SOLID and DRY principles with high priority placed on deep module encapsulation. Modules must expose cohesive, well-defined public interfaces while thoroughly hiding internal implementation complexity.
- **Feature Barrel Encapsulation**: Module entrypoints (`index.ts` barrels) must ONLY export public facade/factory contracts (e.g. `createGeminiAdapter()`, `createDuckAiAdapter()`) and public consumer types. Internal implementation details—selectors, scrapers, mutation observers, DOM injectors, and layout controllers—must remain strictly encapsulated and unexported.
- **Contract Submodule Barrels**: All contracts under `src/contracts/` must be imported from explicit submodule barrels (`@/contracts/core`, `@/contracts/chats`, `@/contracts/features/*`). Monolithic root barrels (`src/contracts/index.ts`) are strictly prohibited to prevent circular dependencies and accidental transitive bundling.
- **Code-Splitting via Lazy Factories**: All host chat adapters, serializers, and heavy document renderers must be registered via dynamic import factories (`() => import(...)`) in the composition root (`src/index.ts`) to ensure clean code-splitting chunks (`dist/dev/duckai-*.js`, `gemini-*.js`).
- **Observability & Telemetry**: Require `CoreLogger.getLogger(...)` with scoped namespaces (`ext:gemini`, `ext:duckai`, `ext:storage`) for all telemetry; forbid arbitrary `console.log`.
- **Zero-Permission WebExtension Storage Boundary**: The extension operates strictly within the default 10MB `browser.storage.local` quota with automatic 8MB LRU pruning. Never add elevated storage or download permissions (`unlimitedStorage`, `downloads`) to `src/manifest.json`.

## Test Design & Auditing Standards
Follow the rules documented in `docs/test-design.org` whenever designing, implementing, refactoring, or auditing tests:
- **AAA & Single Assertion**: Structure tests strictly as Arrange-Act-Assert with exactly one logical assertion per test.
- **Strict Independence & State Isolation**: Tests must be hermetic and leave zero global, observer, or storage residue. Clean up DOM after each test.
- **Dual Test Harness Architecture**:
  - *Component Unit Tests*: Use `@testing-library/preact` (`render`, `screen`, `fireEvent`, `cleanup`) for testing isolated Preact components in a clean DOM container with accessible role/label queries. Enforce automatic teardown via `cleanup()`.
  - *Host DOM Integration Tests*: Use `tests/fixtures/dom_fixture.ts` (`renderInShadow`, `:has()` polyfills, storage resets) for testing site adapters, mutation observers, and Shadow DOM boundary encapsulation.
  - *Prohibition of Bespoke Test Shims*: All shims that affect or simulate the DOM must reside exclusively in `tests/fixtures/dom_fixture.ts`. Individual test suites must never define bespoke DOM polyfills.
- **Test Pyramid**: High-volume fast unit tests (<10ms), moderate integration tests on DOM fixtures, and selective E2E tests (preferring software-defined E2E; prompt-defined Firefox DevTools MCP tests stored in `tests/ff-devtools_e2e-tests/*.org` with reusable evaluation scripts).
- **Descriptive Categorized Naming**: Long, descriptive names prefixed by test category (`unit: `, `integration: `, `e2e: `, `bench: `).
- **Component-Centric Organization**: Group tests by component/feature under test (mirroring `src/`), not by test tier directory silos.
- **Fail Fast & Concise Logging**: Tests must fail fast with concise structured logging and descriptive failure context.
- **Selective Task Execution Policy**: Avoid running expensive test suites when codebase changes do not warrant them:
  - Run `deno task test:unit` when actively modifying pure logic, parsers, serializers, matchers, or data models.
  - Run `deno task test:integration` when modifying host adapters, DOM observers, or UI components.
  - Run `deno task test:e2e` or the complete `deno task test` pipeline ONLY when modifying `build.ts`, `manifest.json`, entrypoint bootstrapping, or when preparing milestone commits.
- **Benchmark Isolation & Setup Exclusion**: Microbenchmarks (`bench: `) must measure pure operational performance. Setup, fixture generation, runlevel changes, and state resets must NEVER run inside the timed benchmark window. Use Deno benchmark context (`b.start()` / `b.end()`) to strictly isolate the measurement window.
- **Technical Debt Quarantine & Follow-Up Protocol in `technical-debt`**:
  1. *Quarantine Criteria*: When test refactoring uncovers failures caused by known technical debt or architectural omissions in `src/`, do NOT prematurely mutate `src/`. Never quarantine tests to hide newly written test bugs or broken assertions.
  2. *Test Annotation*: Mark the test as quarantined using `ignore: true` in `Deno.test` with an explicit comment citing the tracking ticket:
     `// Quarantined: technical debt in <subsystem>; see .scratch/technical-debt/issues/<id>-<slug>.org`
  3. *Mandatory Ticket Creation*: Create an Org-mode issue ticket under `.scratch/technical-debt/issues/<id>-<slug>.org` following `docs/agents/issue-tracker.org`. The ticket must record the failing test, assertion, root cause in `src/`, target remediation milestone/stage, and acceptance criteria.
  4. *Follow-Up & Resolution Protocol*: When the scheduled milestone/stage refactoring begins, inspect `.scratch/technical-debt/` for open tickets. Once `src/` is remediated, verify the test passes in isolation, remove `ignore: true` and the comment, close the issue ticket with a resolution log, and verify clean execution in `deno task test`.

## Work Breakdown & Planning Labels
- **Iteration Label Disambiguation**: The roadmap and meta-plans already define top-level **Phases** (e.g. Phase 1, Phase 2, Phase 3) and sub-milestone **Stages** (e.g. Stage 1, Stage 2). NEVER re-use "Phase" or "Stage" labels for substeps in work breakdown plans or iteration lists. Use **Step**, **Part**, or **Iteration** for execution substeps.
