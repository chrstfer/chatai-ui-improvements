/**
 * Settlement observation and streaming lifecycle contracts.
 */

export type SettlementState = "streaming" | "settled" | "idle";

/**
 * Generic reference representing a model's assistant response message in the host DOM.
 */
export interface DiscoveredResponseRef {
    readonly id: string;
    readonly element: unknown;
    readonly isSettled: boolean;
}

/**
 * Generic reference representing a code block discovered within a response message.
 */
export interface DiscoveredBlockRef {
    readonly id: string;
    readonly rawText: string;
    readonly languageHint: string;
    readonly element: unknown;
}

/**
 * Event callbacks emitted during assistant response message streaming mutation and settlement.
 */
export interface SettlementObserverCallbacks<T = DiscoveredResponseRef> {
    onResponseDiscovered: (response: T) => void;
    onResponseStreaming: (response: T) => void;
    onResponseSettled: (response: T) => void;
    onResponseRemoved?: (responseId: string) => void;
}

/**
 * Interface implemented by host DOM mutation observers.
 */
export interface SettlementObserver {
    observe(targetNode?: unknown): void;
    disconnect(): void;
    isSettled(id: string): boolean;
}
