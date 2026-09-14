import type { ConversationTurnNode } from "@internal/contracts/core";
import type { DiscoveredResponseRef } from "@internal/contracts/chats";

export interface DuckAiResponseRef extends DiscoveredResponseRef {
    /** Unique identifier of the assistant response message element */
    readonly id: string;
    /** Host DOM element of the assistant response message */
    readonly element: HTMLElement;
    /** Whether the response turn has settled */
    isSettled: boolean;
}

export interface DuckAiObserverOptions {
    /** Macro settlement silence delay in ms before triggering fallback settle (default: 500ms) */
    readonly settlementTimeoutMs?: number;
    /** Micro debounce delay in ms before emitting streaming callbacks (default: 100ms) */
    readonly microDebounceMs?: number;
}

export interface DuckAiCodeBlockRef {
    /** Generated unique identifier for in-flight tracking */
    readonly id: string;
    /** The native div[data-streamdown="code-block"] container */
    readonly hostElement: HTMLElement;
    /** The pre > code element containing pristine text */
    readonly codeElement: HTMLElement;
    /** Raw unmutated text content extracted from the data-island */
    readonly rawCode: string;
    /** Raw language hint from data-language attribute or header */
    readonly rawHint: string;
    /** Canonical format identifier resolved via MatcherRegistry */
    readonly formatId: string;
    /** Display name resolved via MatcherRegistry */
    readonly displayName: string;
    /** External sibling container holding our open Shadow Root */
    siblingContainer?: HTMLElement;
    /** Whether the code block has settled */
    isSettled: boolean;
}

export interface DuckAiTurnContext {
    readonly turnId: string;
    readonly container: HTMLElement;
    readonly turnNode: ConversationTurnNode;
    readonly codeBlocks: Map<string, DuckAiCodeBlockRef>;
}

export interface DuckAiLayoutOptions {
    readonly fullWidth: boolean;
    readonly widthPercent: number;
    readonly isNarrow: boolean;
}
