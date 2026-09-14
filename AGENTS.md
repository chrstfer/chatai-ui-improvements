# Agent Guidelines

## Convention Preferences
Upon conversation initialization, execute skill /org-mode-conventions. All persistent documents, specifications, research reports, ADRs, and issue tickets MUST be native Org-mode (.org) files. When any skill refers to a .md document (e.g. `CONTEXT.md`, `spec.md`, `map.md`), substitute the .org equivalent (`CONTEXT.org`, `spec.org`, `map.org`).

## Org-Mode Source Block Formatting
- **Source Block Delimiters**: `#+BEGIN_SRC` and `#+END_SRC` block delimiters MUST ALWAYS be placed on their own line and start at the absolute beginning of that line (column 0, zero indentation). Never indent `#+BEGIN_SRC` or `#+END_SRC` within lists, quote blocks, or subheadings.

## Math & LaTeX Formatting
Format mathematical notation using vanilla Org-mode syntax:
- General equations and variables do not require `$...$` or `\(...\)` delimiters unless creating centered display equations via `\begin{equation}...\end{equation}`.
- Use LaTeX Greek symbols in ASCII syntax (`\lambda` for lowercase, `\Lambda` for uppercase; `\sigma`, `\Sigma`, `\tau`, `\mu`, `\alpha`, `\beta`, `\Delta`, `\Omega`, `\epsilon`) rather than literal unicode glyphs for maximum portability and human readability.

## Agent skills

### Issue tracker
Local org-mode files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.org`.

### Domain docs
Single-context (`CONTEXT.org` at repo root, `docs/adr/` for ADRs). See `docs/agents/domain.org`.

## Sequential Thinking & Reasoning (`seq/thinking` MCP)
When conducting step-by-step reasoning or deep analysis using the `seq/thinking` MCP tool (`seq:think`, replacing `sequentialthinking`):
- **Descriptive Thought Labels**: Always provide concise, descriptive labels for each thought step (both in tool call metadata such as `toolAction`/`toolSummary` and at the start of the thought). Clearly specify the specific facet, hypothesis, or subsystem being analyzed (e.g., "Evaluating shadow DOM mount boundary", "Analyzing KaTeX delimiter parser") rather than generic placeholders like "Thinking", "Next thought", or "Step N".
- **Dynamic Depth Calibration**: Calibrate thought depth dynamically based on task complexity (typically between 4 and 32 steps) rather than forcing a rigid count:
  - **Focused checks / single-seam refactors**: 4–8 thoughts.
  - **Architectural design / standard research**: 10–16 thoughts.
  - **Complex migrations / subtle async flows / deep algorithms**: 18–32 thoughts.

## Preact UI & Architecture Guidelines
- **standard deno compiler options**: The correct compiler options for Deno with preact are: "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "preact" }
- **Declarative Preact-First UI**: All extension UI elements (HUDs, badges, toolbars, overlays, code block containers, rendered views) MUST be implemented as declarative Preact components using JSX. Never import `h` in `.tsx` files. Never use `document.createElement`, manual `.style.display` mutation, or disjoint `render()` calls for UI composition. Never directly modify `.innerHTML`.
- **Single Preact Root per Mount Boundary**: When attaching extension UI to host DOM elements, mount a single Preact root per host element and project nested elements into host containers using Preact portals (`createPortal`).
- **Build Destination Policy**:
  - Development (`dist/dev/` via `deno task build:dev`): Default target for all active development and automated workflows.
  - Release (`dist/release/` via `deno task build`): Only run upon explicit user request.

## Code Formatting Policy
- **Format In-Place Rather than Checking**: Never run `deno fmt --check`. Always apply formatting directly in-place with `deno fmt`.
- **Silent Formatting Output**: Discard `deno fmt` output to null (`deno fmt > /dev/null 2>&1`) to avoid polluting execution logs.

## Software Engineering & Design Principles
- **DRY & SOLID with Prioritized Encapsulation**: Code written MUST follow DRY and SOLID principles with high priority placed on deep module encapsulation. Feature module entrypoints (e.g., `index.ts` barrels) MUST only export public facade/adapter contracts and keep internal implementation details (e.g., internal selectors, private intermediate refs, observers, DOM injectors, and layout controllers) encapsulated rather than blanket re-exporting internal subsystems.
- **Common Test Fixtures & Shared Test Harnesses**: Tests MUST use common fixtures and shared test harnesses under `tests/fixtures/` where similar components are needed for testing. All shims that affect or simulate the DOM must reside exclusively in `tests/fixtures/dom_fixture.ts` (for `:has()` query polyfills, style declarations, and storage resets) rather than duplicating bespoke DOM shims across test files.

## Test Design & Auditing Standards
Follow the rules documented in `docs/test-design.org` whenever designing, implementing, refactoring, or auditing tests:
- **AAA & Single Assertion**: Structure tests strictly as Arrange-Act-Assert with exactly one logical assertion per test.
- **Strict Independence & State Isolation**: Tests must be hermetic and leave zero global, observer, or storage residue.
- **Test Pyramid**: High-volume fast unit tests, moderate integration tests on DOM fixtures, and selective E2E tests (preferring software-defined E2E; prompt-defined Firefox DevTools MCP tests stored in `tests/ff-devtools_e2e-tests/*.org` with reusable evaluation scripts).
- **Descriptive Categorized Naming**: Long, descriptive names prefixed by test category (`unit: `, `integration: `, `e2e: `).
- **Component-Centric Organization**: Group tests by component/feature under test (mirroring `src/`), not by test tier directory silos.
- **Fail Fast & Concise Logging**: Tests must fail fast with concise structured logging and descriptive failure context.
- **Selective Task Execution Policy**: Avoid running expensive test suites when codebase changes do not warrant them:
  - Run `deno task test:unit` when actively modifying pure logic, parsers, serializers, matchers, or data models.
  - Run `deno task test:integration` when modifying host adapters, DOM observers, or UI components.
  - Run `deno task test:e2e` or the complete `deno task test` pipeline ONLY when modifying `build.ts`, `manifest.json`, entrypoint bootstrapping, or when preparing milestone commits.
- **Benchmark Isolation & Setup Exclusion**: Microbenchmarks (`bench: `) must measure pure operational performance. Setup, fixture generation, runlevel changes, and state resets must NEVER run inside the timed benchmark window. Use Deno benchmark context (`b.start()` / `b.end()`) to strictly isolate the measurement window.
- **Technical Debt Quarantine**: When test refactoring uncovers failures caused by known technical debt in `src/`, do NOT prematurely mutate `src/`. Mark the test as quarantined using `ignore: true` in `Deno.test` with an explicit comment detailing the debt and linking to the upcoming `CONTEXT.org` audit item.


## Work Breakdown & Planning Labels
- **Iteration Label Disambiguation**: The roadmap and meta-plans already define top-level **Phases** (e.g. Phase 1, Phase 2, Phase 3) and sub-milestone **Stages** (e.g. Stage 1, Stage 2). NEVER re-use "Phase" or "Stage" labels for substeps in work breakdown plans or iteration lists. Use **Step**, **Part**, or **Iteration** for execution substeps.

