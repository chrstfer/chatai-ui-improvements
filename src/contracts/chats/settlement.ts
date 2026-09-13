/**
 * Settlement observation and streaming lifecycle contracts.
 */

export type SettlementState = "streaming" | "settled" | "idle";

/**
 * Generic reference representing a code block discovered in the host DOM.
 */
export interface DiscoveredBlockRef {
    readonly id: string;
    readonly rawText: string;
    readonly languageHint: string;
    readonly element: unknown;
}

/**
 * Event callbacks emitted during streaming mutation and settlement.
 */
export interface SettlementObserverCallbacks<T = DiscoveredBlockRef> {
    onBlockDiscovered: (block: T) => void;
    onBlockStreaming: (block: T) => void;
    onBlockSettled: (block: T) => void;
}

/**
 * Interface implemented by host DOM mutation observers.
 */
export interface SettlementObserver {
    observe(targetNode?: unknown): void;
    disconnect(): void;
    isSettled(id: string): boolean;
}
