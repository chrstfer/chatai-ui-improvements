Re-evaluating Component Design

The core design choice: whether `InSituCodeBlock` remains relevant given the shift towards encompassing entire message components. The existing `StructuredMessageContainer` now handles the broader scope of user queries and model responses. Initial consideration suggested `InSituCodeBlock` might be redundant.


Defining Message Rendering Structure

The `MessageContentContainer` will be the new top-level component, housing message content derived from DOM nodes. Inside, structured content will be rendered based on DOM elements. This includes text (e.g., `<p>`) and code blocks, which will potentially be rendered with specialized views. It is necessary to consider how the code block render buttons should cycle through different renderers, rather than using toggle states.


Reframing Code Block Handling

The `DomObserver`'s role needs refinement given the new architecture; it must now target entire message turns, not just individual code blocks. The current code block management strategy, specifically `InSituCodeBlock`, is potentially being overscoped with the move toward turn-level components. This impacts the function of the `StructuredMessageContainer`, which may not need to deal with each code block, but instead should be able to render the content container containing code blocks.


Defining Component Interaction Boundaries

Considering strict constraints, the primary concern is managing Preact-Angular integration. Preact's rendering must not interfere with Angular's streaming; therefore, strict adherence to `createPortal` is required. The `MessageTurnController` will encapsulate all Preact rendering within a single root, avoiding conflicts with the host application's DOM management. The interaction with existing features like KaTeX math rendering and AST caching should be validated to ensure their continued functionality.


Evaluating Rendering Architecture Options

The system can render a toolbar and a content container within a turn. Inside the content container, code blocks are handled by portal projection (Design 1). 

Design 2 (virtual pipeline) uses a parsed AST for virtual DOM rendering; this could cause live-streaming desync. Design 3 (hybrid slot projection) prioritizes Angular integration.

I'm thinking through how to approach this. 


Codebase Design: Turn-Level Message Architecture & Outline Fold Cycling

We are executing the transition from isolated code-block enhancement to full conversation turn targeting (user-query and model-response), replacing binary toggles with multi-level outline cycling.
──────

## 1. Problem Space & Constraints

### The Problem

Previously, observer.ts targeted individual code-block elements, mounting a disjoint InSituCodeBlock.tsx root for each code block. This isolated code snippets from the message turn context (turn role, header actions, prompt text, disclaimers) and made message-level folding impossible.

### Constraints & Invariants

1. Declarative Preact-First Boundary: Exactly one Preact root per host element boundary. Extension UI elements must be projected into host slots via createPortal.
2. Host Angular Coexistence: Gemini's Angular framework dynamically mutates .markdown-main-panel during streaming. Replacing or removing Angular's DOM nodes directly triggers NotFoundError / ExpressionChangedAfterItHasBeenCheckedError crashes.
3. In-Place Replacement: When an embedded code block (response-element.no-md > code-block) has a registered renderer (e.g. Org-mode), it must be replaced in-place by DocumentView (OrgDocumentView), hiding the raw code container without detaching it from Angular. Non-renderable code blocks remain native with collapsible folding.
4. Universal 3-State Fold Cycling: Section headings and fold buttons must cycle through FOLDED → CHILDREN → SUBTREE → FOLDED (leaf headings cycle FOLDED ↔ EXPANDED).
5. Dependency Categories (per DEEPENING.md):
    - In-process: Outline fold state transitions, KaTeX math parsing, AST document parsing, style calculations. Always deepenable with zero I/O adapters.
    - Local-substitutable / DOM: Browser DOM elements (HTMLElement), MutationObserver, Preact portals.
──────

## 2. Design It Twice: Three Alternative Interfaces
### Design A: The Deep Turn Controller (Minimized Interface, Maximum Leverage)

Focus: Reduce the external interface to the smallest possible surface area.

┌────────────────────────────────────────────────────────┐
│  MessageTurnController (Small Interface)              │
│  - processTurn(turnEl: HTMLElement): TurnRecord       │
│  - unmountTurn(turnEl: HTMLElement): void             │
│  - cycleFoldingAll(): void                            │
│  - cycleRenderingAll(): void                          │
├────────────────────────────────────────────────────────┤
│  Deep Implementation:                                 │
│  - Role detection (user-query vs model-response)      │
│  - StructuredMessageContainer Preact Root             │
│  - Portal into Header Actions (MessageToolbar)        │
│  - MessageContentContainer Slot Coordinator           │
│  - Code block in-place swap & OrgDocumentView mount   │
└────────────────────────────────────────────────────────┘

#### Interface
```{typescript}
export interface TurnRecord {
   id: string;
   role: "user" | "model";
   turnEl: HTMLElement;
   mountEl: HTMLElement;
   codeBlocks: CodeBlockRecord[];
}

export class MessageTurnController {
   processTurn(turnEl: HTMLElement): TurnRecord | undefined;
   unmountTurn(turnEl: HTMLElement): void;
   prune(): void;
   cycleFoldingAll(): void;
   cycleRenderingAll(): void;
}
```

#### What sits behind the seam
Callers (DomObserver) know nothing about Preact, portals, AST parsing, or Angular class names. They simply pass turnEl when discovered and detached. Behind the seam, MessageTurnController mounts StructuredMessageContainer, which portals MessageToolbar into the host action container and renders MessageContentContainer over the content slots.
──────

### Design B: The Virtual Document Pipeline (Maximized Declarative Purity)
Focus: Pure declarative Preact tree; eliminate all portal surgery.

┌────────────────────────────────────────────────────────┐
│  MessageContentContainer (Declarative Interface)       │
│  <StructuredMessageContainer message={turnModel}>      │
│    <MessageToolbar />                                  │
│    <MessageContentContainer>                          │
│      {segments.map(s =>                                │
│         s.type === 'text' ? <Paragraph text={s.text}/>:│
│         s.lang === 'org'  ? <OrgDocumentView ... /> :  │
│                             <NativeCodeBlock ... />    │
│      )}                                                │
│    </MessageContentContainer>                          │
│  </StructuredMessageContainer>                         │
├────────────────────────────────────────────────────────┤
│  Implementation: Complete DOM takeover via clone/AST  │
└────────────────────────────────────────────────────────┘

#### Interface
```{typescript}
export interface MessageSegment {
   type: "paragraph" | "code_block" | "disclaimer";
   rawText: string;
   lang?: string;
}

export interface MessageTurnModel {
   id: string;
   role: "user" | "model";
   segments: MessageSegment[];
}

export function parseMessageTurn(turnEl: HTMLElement): MessageTurnModel;
```

#### Trade-offs
- High Purity: Eliminates portals and DOM slot surgery.
- Fragile Coexistence: Hides the host's entire .markdown-main-panel behind display: none and rebuilds the whole message in Preact. During live token streaming, re-parsing and re-rendering paragraphs introduces micro-stutters and desynchronization with Angular's active mutation stream.
──────

### Design C: The In-Place Slot Proxy (Maximized Coexistence & Seam Locality)
Focus: Seamless coexistence with Angular streaming; surgical in-place replacement of renderable code blocks.

┌────────────────────────────────────────────────────────┐
│  StructuredMessageContainer (Turn Seam)               │
│  - Role: user-query | model-response                   │
│  - MessageToolbar: Portaled to host actions header     │
│  - MessageContentContainer: Subscribes to contentEl    │
├────────────────────────────────────────────────────────┤
│  MessageContentContainer (Content Seam)               │
│  - Scans children of .markdown-main-panel              │
│  - Leaves <p> untouched for Angular streaming          │
│  - Detects response-element.no-md > code-block        │
│  - For Org: Hides code-block, portals OrgDocumentView  │
│  - For non-Org: Injects folding collapse bar           │
└────────────────────────────────────────────────────────┘

#### Interface
```{typescript}
export interface StructuredMessageContainerProps {
   id: string;
   role: "user" | "model";
   turnEl: HTMLElement;
   contentContainerEl: HTMLElement;
   headerActionsEl?: HTMLElement | null;
   blockStore?: BlockStore;
}

export interface MessageContentContainerProps {
   turnId: string;
   contentEl: HTMLElement;
   foldState: OutlineFoldState;
   renderMode: RenderMode;
}
```
──────

## 3. Comparison of Alternatives
| Quality          | Design A: Deep Turn Controller                 | Design B: Virtual Pipeline                     | Design C: In-Place Slot Proxy                   |
|------------------+------------------------------------------------+------------------------------------------------+-------------------------------------------------|
| Depth (Leverage) | Very High: Callers use 2 methods (processTurn, | Medium: Callers must coordinate parsing,       | High: Clean component boundary between turn     |
|                  | unmountTurn). All complexity hidden.           | segmenting, and rendering cycles.              | shell and content slots.                        |
| Locality         | High: Turn lifecycle, DOM observation, and     | Low: Logic split between extractor, segmenter, | High: Angular DOM isolation concentrated        |
|                  | unmounting concentrated in one controller.     | and virtual render components.                 | strictly within MessageContentContainer.        |
| Seam Placement   | Seam placed at DOM turn discovery boundary     | Seam placed at text extraction boundary        | Seam placed at Preact root boundary per message |
|                  | (DomObserver → MessageTurnController).         | (parseMessageTurn).                            | turn.                                           |
| Host Safety      | Safely wraps host nodes without fighting       | High risk of streaming desync or flicker.      | Zero streaming interference; paragraphs stream  |
|                  | Angular.                                       |                                                | natively.                                       |

──────
  
## 4. Recommended Architecture: Hybrid A + C
The strongest design is a hybrid of Design A and Design C:

1. Outer Seam (Module Depth): Implement Design A (MessageTurnController) at the DOM discovery seam. DomObserver only knows how to process and unmount turns (model-response and user-query).

2. Inner Seam (Preact Composition): Inside MessageTurnController, mount a single Preact root per message turn:
  
  - StructuredMessageContainer.tsx wraps the turn.
  
  - Projects OrgToolbar.tsx (with persistent "Fold" outline cycler and "View Org/Raw" render mode cycler) via portal into the turn actions container.
  
  - Renders MessageContentContainer to manage code block slots:
  
  - For Org blocks: hides response-element.no-md > code-block with display: none and projects OrgDocumentView.tsx in-situ into an adjacent mount slot.
  
  - For non-Org blocks: wraps the native code element with the collapsible folding badge (📦 [lang] (N lines) — Click to expand).

  - For text paragraphs: preserves native <p> elements without interfering with Angular's streaming mutation stream.

3. Retire InSituCodeBlock: Deleted entirely as its responsibilities are absorbed by MessageContentContainer.

Would you like to proceed with implementing this hybrid architecture?
