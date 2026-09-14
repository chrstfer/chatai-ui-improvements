/**
 * Core conversation domain models.
 * Canonical definitions shared across history persistence and serializers.
 */

/**
 * Individual content segment within a model response.
 */
export interface ResponseSegment {
    /** Segment type: regular prose paragraph or code block */
    readonly type: "prose" | "code-block";
    /** Raw content string (preserves exact source for code blocks) */
    readonly content: string;
    /** Declared or detected language identifier for code blocks */
    readonly language?: string;
    /** Optional segment-level metadata */
    readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Atomic conversational turn node pairing user query with model response.
 */
export interface ConversationTurnNode {
    /** Deterministic turn ID: FNV-1a hash of (parentTurnId + userQuery + turnIndex) */
    readonly id: string;
    /** Parent turn ID in the conversation tree (null for the root turn) */
    readonly parentTurnId: string | null;
    /** Ordered generation index among sibling responses to the same parent prompt (0 for initial, 1+ for regenerations/edits) */
    readonly parentResponseIndex?: number;
    /** Epoch timestamp (ms) when turn was settled */
    readonly timestamp: number;
    /** Raw user prompt string */
    readonly userQuery: string;
    /** Array of segmented child response elements */
    readonly modelResponse: readonly ResponseSegment[];
    /** True if response completed normally; false if cancelled, stopped, or interrupted */
    readonly isCompleted: boolean;
    /** ID of the currently active child branch */
    readonly activeChildId?: string;
}
