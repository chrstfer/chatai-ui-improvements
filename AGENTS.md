# Agent Guidelines

## Convention Preferences
Upon conversation initialization, execute skill /org-mode-conventions. All persistent documents, specifications, research reports, ADRs, and issue tickets MUST be native Org-mode (.org) files. When any skill refers to a .md document (e.g. `CONTEXT.md`, `spec.md`, `map.md`), substitute the .org equivalent (`CONTEXT.org`, `spec.org`, `map.org`).

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

