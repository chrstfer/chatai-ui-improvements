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
}

/**
 * Standard Preact component type for rendering custom language documents.
 */
export type DocumentViewComponent = ComponentType<DocumentViewProps>;
