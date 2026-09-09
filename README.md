# AI Chat UI Improvements & Org-Mode Document Views

A Firefox-first WebExtension (compatible with Zen Browser, Floorp, and Chromium) that elevates AI chat interfaces (starting with Google Gemini) with rich in-situ document rendering, canonical Org-mode outline cycling, offline mathematical typesetting, widescreen layout controls, and an ephemeral floating HUD.

---

## Key Features

### 1. Rich In-Situ Org-Mode Document Views
- **Declarative Preact Rendering**: Replaces raw Org code blocks with rich, interactive document views mounted inside encapsulated open Shadow Roots with Tailwind CSS v4.
- **Data-Island Non-Destructive Mutation**: Preserves the host application's original `<code-block>` DOM nodes in a hidden state (`display: none`), maintaining 100% fidelity for native scrapers, copy operations, and session persistence.
- **0ms Hydration & AST Caching**: Parsed ASTs are stored in a decoupled in-memory LRU cache (`AstCache`) keyed by content hash, surviving virtual-scroller recycling without re-parsing.

### 2. Canonical 3-State Outline Visibility Cycling
Full GNU Emacs Org-mode outline cycling behavior across all headline levels ($H_1 \dots H_6$):
- **`folded`** ($\boldsymbol{\blacktriangleright} + \dots$): Headline header card only; all body paragraphs, drawers, and child headlines are hidden.
- **`children`** ($\boldsymbol{\rhd} + \dots$): Direct child headlines are revealed strictly in their `folded` state ($\boldsymbol{\blacktriangleright} + \dots$), while direct body paragraphs, blocks, and deeper grandchild subtrees remain hidden.
- **`subtree`** ($\boldsymbol{\triangledown}$): The entire subtree—body paragraphs, property drawers, planning lines, and nested headlines—is fully expanded.
- **Descendant State Pruning**: Collapsing a parent headline prunes cached child expansion states so subsequent expansions start fresh from the canonical baseline.
- **Full-Card Click Target**: Clicking anywhere across the headline card (outside buttons, links, and badges) advances the cycle.

### 3. Code Block Heading Parity ($H_0$)
Per [ADR 0003](docs/adr/0003-code-block-heading-parity.org), the outer code block container header functions as an encompassing root heading ($H_0$) for the document:
- **3-State Block Cycling**: Clicking the block header cycles $\text{subtree} \to \text{folded} \to \text{children} \to \text{subtree}$ with left-side glyph parity ($\boldsymbol{\blacktriangleright}$ / $\boldsymbol{\rhd}$ / $\boldsymbol{\triangledown}$).
- **2-State Quick Bypass**: The dedicated toolbar collapse button (`+` / `−`) toggles directly between collapsed and expanded without traversing the intermediate `children` state.
- **Decoupled View Mode**: Switching between "Rendered View" and "Raw Source View" is isolated to the dedicated toolbar button and excluded from fold cycling.
- **Non-AST Code Blocks**: Standard syntax code blocks (e.g. Python, JavaScript, Rust) adopt 2-state folding across both click targets.

### 4. Interactive Document Elements
- **Interactive Checklists & Progress Cookies**: Toggleable checkboxes (`- [ ]` / `- [X]`) with dynamic progress cookies (`[1/3]`, `[33%]`) that recalculate in real time.
- **TODO State Cycling**: Interactive status badges cycling `TODO` $\to$ `NEXT` $\to$ `DONE` with persistent view state overrides.
- **Scoped Subtree Copying**: One-click clipboard export (`serializeOrgSubtree`) extracting the complete textual representation of any headline and its subtrees with visual confirmation.
- **Pipe Tables**: Auto-normalizing pipe tables with formatted header rows (`<thead>`), aligned data cells, and zebra striping.
- **Property Drawers & Planning**: Collapsible `:PROPERTIES: ... :END:` drawers and formatted `SCHEDULED:`, `DEADLINE:`, and `CLOSED:` timestamp lines.

### 5. Offline KaTeX Mathematical Typography
Per [ADR 0001](docs/adr/0001-katex-math-pipeline.org):
- **100% Offline & CSP-Compliant**: Bundles KaTeX fonts and CSS with zero external network requests.
- **Math Formatting**: Renders inline math expressions (`$...$`, `\(...\)`), display equations (`\[...\]`, `$$...$$`), and LaTeX equation environments (`\begin{equation}...\end{equation}`).
- **ASCII LaTeX Greek Symbols**: Formats ASCII Greek tokens (`\alpha`, `\beta`, `\lambda`, `\sigma`, `\tau`, `\Delta`, `\Omega`) into crisp mathematical glyphs.

### 6. Widescreen Layout & Responsive Floating HUD
- **Widescreen Utilization**: Removes artificial ~768px constraints while preserving natural user prompt bubble proportions.
- **Compact Icon Mode**: Collapses into a compact 36×36px (`w-9 h-9`) rounded square with an electric `⚡` icon.
- **Header Click Toggle**: Clicking the HUD header bar or collapse button toggles collapsed/expanded state.
- **Instant 1:1 Drag Tracking**: Ultra-responsive pointer dragging without motion lag or trailing latency.
- **Width Presets**: Quick buttons for 80%, 90%, 94%, and 100% full width, backed by typed WebExtension storage.

---

## Architectural Highlights

- **Preact-First Declarative UI**: All views, badges, toolbars, and overlays are implemented as declarative Preact components using JSX (zero `document.createElement` or manual `.innerHTML` manipulation).
- **Tailwind CSS v4 Inlined Singleton**: Compiled in-process at build time and inlined as a string constant (`adoptedStyleSheets`), guaranteeing 0ms hydration and zero duplicate memory allocations across Shadow DOM boundaries (see [ADR 0002](docs/adr/0002-tailwind-v4-shadow-dom.org)).
- **Pure Headless Domain Layer**: AST parsers (`src/languages/org/ast/`), serializers, and contracts are 100% pure TypeScript with zero DOM or browser API dependencies.
- **Firefox-First & MV3 Bootloader**: Targets the standard `browser.*` WebExtensions namespace with a lightweight dynamic import bootloader (`content.js`) resolving code-split chunks against extension origin.

---

## Development & Build Workflows

Prerequisites: [Deno 2+](https://deno.com)

```bash
# Build development extension into dist/dev/
deno task build:dev

# Run full automated test suite (130+ unit, component, and integration tests)
deno task test

# Run linter
deno task lint

# Format code in-place
deno task fmt

# Build release package (upon explicit request)
deno task build
```

---

## Testing in Firefox / Zen Browser

1. Build the development extension:
   ```bash
   deno task build:dev
   ```
2. Open Firefox or Zen Browser and navigate to:
   ```text
   about:debugging#/runtime/this-firefox
   ```
3. Click **"Load Temporary Add-on..."**.
4. Select `dist/dev/manifest.json` from this repository.
5. Navigate to [gemini.google.com](https://gemini.google.com) and test any Org-mode prompt output or mathematical equation.

---

## Documentation

- **Domain Model & Architecture**: [`CONTEXT.org`](CONTEXT.org)
- **Architectural Decision Records (ADRs)**:
  - [ADR 0001: KaTeX Math and LaTeX Greek Rendering Pipeline](docs/adr/0001-katex-math-pipeline.org)
  - [ADR 0002: Tailwind CSS v4 in Isolated Shadow DOM Boundaries](docs/adr/0002-tailwind-v4-shadow-dom.org)
  - [ADR 0003: Code Block Heading Parity and Document Outline Folding](docs/adr/0003-code-block-heading-parity.org)
- **Feature Roadmap**: [`docs/roadmap.org`](docs/roadmap.org)
