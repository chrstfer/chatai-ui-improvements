import type { ConversationTurnNode } from "../../core/contracts/index.ts";

export interface GeminiCodeBlockRef {
    /** ID generated for tracking in-flight debouncing */
    id: string;
    /** The native <code-block> element */
    hostElement: HTMLElement;
    /** The native <code data-test-id="code-content"> element */
    codeContentElement: HTMLElement;
    /** Raw text content extracted from the data-island */
    rawText: string;
    /** Language hint extracted from header or heuristic */
    languageHint: string;
    /** Sibling container holding the shadow root */
    siblingContainer?: HTMLElement;
    /** Whether the block response has settled */
    isSettled: boolean;
}

export interface GeminiTurnContext {
    turnId: string;
    container: HTMLElement;
    turnNode: ConversationTurnNode;
    codeBlocks: Map<string, GeminiCodeBlockRef>;
}
