---
name: source-tree-hierarchy
description: "Document directory architectures and source tree hierarchies as native Org-mode files with property drawers, seam specifications, and file breakdowns. Use when documenting a repository's directory layout, creating a source tree reference, or updating source_tree_hierarchy.org after codebase restructuring."
---

# Source Tree Hierarchy Documentation

This skill guides the creation and maintenance of architectural directory hierarchy documents formatted in native **Emacs Org-mode syntax (`.org`)**, exemplified by `docs/source_tree_hierarchy.org`.

The document serves two roles:
1. **Human Wayfinding Map**: A human-navigable outline of the codebase where folding levels (`TAB`, `S-TAB`) naturally reflect directory depth.
2. **Machine-Readable Seam Catalog**: An indexed catalog of architectural seams, dependencies, and file types stored in native Org property drawers (`:PROPERTIES: ... :END:`).

---

## Core Process

Follow this 4-step sequence to produce or update a source tree hierarchy document:

### 1. Census: Directory & File Enumeration
Gather a complete, recursive inventory of the target root directory (typically `src/`):
- Enumerate every directory and subdirectory recursively without omitting intermediate paths.
- Collect file counts and distinct file extensions (`.ts`, `.tsx`, `.css`, `.rs`, `.go`, etc.) within each directory.
- Differentiate between **root entry points** (files residing directly at the top level of the root) and **subdirectories**.

*Completion Criterion*: A complete directory manifest matching `find <root> -type d` and `find <root> -type f` with zero uncataloged paths.

### 2. Seam & Dependency Analysis
For each directory identified in the census, determine its architectural role and interface boundary:
- **Purpose**: A concise, 1-line architectural statement defining the directory's primary responsibility. Focus on what capability it encapsulates rather than restating its folder name.
- **Primary Seam**: The architectural interface or boundary pattern by which external code consumes this directory (e.g. `Preact Context API`, `Three-Layer Style Architecture`, `LanguageRegistry & AST Models`, `TypeScript Type Definitions`).
- **Key Dependencies**: Internal cross-subsystem paths (e.g. `src/context/`, `src/types/settings.ts`) and major third-party libraries (e.g. `preact`, `katex`).
- **File Types**: Comma-separated list of extensions present in the directory.
- **Status**: Operational lifecycle state (`Active`, `Draft`, `Deprecated`, `Experimental`).

*Completion Criterion*: Every directory in the manifest has all five metadata attributes resolved with zero empty fields or generic placeholders.

### 3. Document Synthesis: Org-Mode Construction
Assemble the hierarchy document using strict Org-mode outline conventions:

1. **Top-Matter Metadata**:
   ```org
   #+TITLE: Source Tree Hierarchy & Directory Architecture: <root>/
   #+DATE: <YYYY-MM-DD>
   #+AUTHOR: <Author / Agent Name>
   #+OPTIONS: toc:3 num:nil
   ```
2. **Star-Depth Continuity**:
   Map directory nesting directly to Org headline levels. Never skip star levels:
   - `* <root>/` (H1: Target root directory)
   - `** <subdir>/` (H2: Direct children of root)
   - `*** <subdir>/<nested>/` (H3: Second-level nesting)
   - `**** <nested-sub>/` (H4: Third-level nesting)
3. **Property Drawers**:
   Attach the standardized property drawer immediately below each directory headline before any prose or empty lines:
   ```org
   * <root>/
   :PROPERTIES:
   :PATH: <path>/
   :PURPOSE: <1-line architectural statement>
   :FILE_TYPES: <comma-separated extensions>
   :PRIMARY_SEAM: <interface or boundary pattern>
   :KEY_DEPENDENCIES: <internal paths & external libraries>
   :STATUS: Active
   :END:
   ```
4. **Architectural Prose & Summary**:
   Immediately follow the drawer with a descriptive paragraph explaining how the directory fits into the overall system architecture. Write paragraphs as natural, fluid text without artificial hard wrapping, allowing editors and buffers to handle line wrapping dynamically.
5. **Entry Points & File Inventories**:
   Document key files using definition lists or structured bullets:
   - For root entry points:
     ```org
     *Root Entry Points*:
     - ~constants.ts~ :: Canonical DOM selectors and configuration tokens.
     - ~content.ts~ :: Main WebExtension content script entry point.
     ```
   - For subdirectories with multiple files:
     ```org
     *Files & Responsibilities*:
     - *~observer.ts~*: Monitors live DOM mutations via ~MutationObserver~.
     - *~chat-extractor.ts~*: Extracts conversational turns and code blocks.
     ```

*Completion Criterion*: The generated `.org` file contains valid Org-mode syntax, strict star-depth continuity across all directories, and fully populated property drawers.

### 4. Verification & Parity Audit
Validate the written document against the live filesystem:
- **Path Parity**: Ensure every `:PATH:` value matches an existing directory on disk.
- **Completeness**: Verify that no directories on disk were skipped or collapsed.
- **Drawer Integrity**: Verify that every headline has a corresponding `:PROPERTIES:` and `:END:` delimiter.

*Completion Criterion*: 100% path parity between disk and the document, with zero orphaned or unrepresented directories.

---

## Reference & Invariants

### Standard Property Drawer Schema

Every directory heading must include this exact drawer structure:

| Drawer Property       | Description                                                 | Example                                                   |
|-----------------------+-------------------------------------------------------------+-----------------------------------------------------------|
| `:PATH:`              | Repository-relative path with trailing slash                | `src/languages/org/components/`                           |
| `:PURPOSE:`           | 1-line architectural statement of responsibility            | `Declarative Preact components rendering Org AST nodes`   |
| `:FILE_TYPES:`        | Comma-separated list of file extensions                     | `.ts, .tsx`                                               |
| `:PRIMARY_SEAM:`      | Architectural interface or boundary pattern                 | `Preact JSX Components`                                   |
| `:KEY_DEPENDENCIES:`  | Internal subsystem paths and third-party packages           | `preact, src/languages/org/types/ast.ts, src/ui/folding.ts` |
| `:STATUS:`            | Lifecycle status (`Active`, `Draft`, `Deprecated`)          | `Active`                                                  |

### Star-Depth Mapping Table

| Directory Level             | Org Headline Syntax | Example                              |
|-----------------------------+---------------------+--------------------------------------|
| Root (`src/`)               | `* <name>/`         | `* src/`                             |
| Level 1 Subdirectory        | `** <name>/`        | `** context/`                        |
| Level 2 Subdirectory        | `*** <path>/`       | `*** languages/org/`                 |
| Level 3 Subdirectory        | `**** <name>/`      | `**** parser/`                       |
| Level 4 Subdirectory        | `***** <name>/`     | `***** ast/`                         |

### Anti-Patterns to Reject

- **Skipped Headline Depths**: Jumping from `* src/` directly to `*** parser/`. Headline levels must increment by exactly one per directory nesting level to preserve Org outline folding (`TAB`).
- **Separated Property Drawers**: Placing text, blank lines, or comments between a headline and its `:PROPERTIES:` drawer. In Org-mode, property drawers must immediately follow the heading.
- **Vague / No-Op Purposes**: Writing tautological purposes like `"Contains files for dom"`. State the architectural capability: `"Host DOM observation, mutation scanning, and conversation turn extraction"`.
- **Sediment & Stale Paths**: Retaining deleted or relocated directories in the hierarchy document. Always run the census step against the current filesystem state before generating or updating the document.
- **Prose Sprawl**: Listing every helper function inside the hierarchy document. The document indexes directories, architectural seams, and primary entry point files; detailed function documentation belongs in code docstrings or dedicated module specs.
- **Artificial Hard Wrapping**: Inserting manual line breaks at arbitrary column boundaries (e.g. 80 chars) within paragraphs or list descriptions. Keep prose lines natural and contiguous; allow buffers and editors to soft-wrap dynamically.
