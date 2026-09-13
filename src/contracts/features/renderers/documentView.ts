/**
 * Document View Component contracts for interactive Preact presentations.
 */

import type { ComponentType } from "preact";

/**
 * Props passed to any custom document view renderer.
 */
export interface DocumentViewProps {
    /** Raw content string extracted from the data-island */
    readonly content: string;
    /** Normalized language identifier (e.g. 'org', 'latex', 'python') */
    readonly language: string;
    /** True until the response is fully settled. */
    readonly isStreaming?: boolean;
    /** Optional metadata associated with the turn or block */
    readonly metadata?: Readonly<Record<string, unknown>>;
    /** Opaque view state previously saved by this document view (e.g. folded headline sets) */
    readonly documentViewState?: unknown;
    /** Callback enabling the document view to persist custom UI state in the LRU cache */
    readonly onSaveViewState?: (state: unknown) => void;
}

/**
 * Standard Preact component type for rendering custom language documents.
 */
export type DocumentViewComponent = ComponentType<DocumentViewProps>;
