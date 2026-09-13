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

## Sequential Thinking & Reasoning
When conducting sequential thinking or deep analysis, calibrate thought depth dynamically based on task complexity (typically between 4 and 32 steps) rather than forcing a rigid count:
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

## Work Breakdown & Planning Labels
- **Iteration Label Disambiguation**: The roadmap and meta-plans already define top-level **Phases** (e.g. Phase 1, Phase 2, Phase 3) and sub-milestone **Stages** (e.g. Stage 1, Stage 2). NEVER re-use "Phase" or "Stage" labels for substeps in work breakdown plans or iteration lists. Use **Step**, **Part**, or **Iteration** for execution substeps.

