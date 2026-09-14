import { createLogger } from "../../../core/logging/index.ts";
import type { SettlementObserver, SettlementObserverCallbacks } from "../../../contracts/chats/index.ts";
import { DUCKAI_SELECTORS } from "./selectors.ts";
import type { DuckAiObserverOptions, DuckAiResponseRef } from "./types.ts";

/**
 * MutationObserver implementation for DuckDuckGo AI (duck.ai) assistant response messages.
 * Tracks model response turns through streaming mutations and detects settlement
 * via message action bar mounting and configurable silence debouncing.
 */
export class DuckAiDomObserver implements SettlementObserver {
    private logger = createLogger("DuckAI > Observer");
    private observer: MutationObserver | null = null;
    private callbacks: SettlementObserverCallbacks<DuckAiResponseRef>;
    private pendingDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private discoveredResponses = new Map<string, DuckAiResponseRef>();
    private settledResponses = new Set<string>();
    private fallbackIdCounter = 0;
    private destroyed = false;

    private readonly microDebounceMs: number;
    private readonly settlementTimeoutMs: number;

    constructor(
        callbacks: SettlementObserverCallbacks<DuckAiResponseRef>,
        options: DuckAiObserverOptions = {},
    ) {
        this.callbacks = callbacks;
        this.settlementTimeoutMs = options.settlementTimeoutMs ?? 500;
        this.microDebounceMs = options.microDebounceMs ?? 100;
    }

    /**
     * Attach MutationObserver to host chat root and scan pre-existing responses.
     */
    public observe(targetNode: unknown = (typeof document !== "undefined" ? document.body : undefined)): void {
        this.disconnect();
        this.destroyed = false;

        if (typeof MutationObserver === "undefined") return;
        const root = (targetNode as Node) ?? (typeof document !== "undefined" ? document.body : null);
        if (!root) return;

        this.logger.debug("Attaching MutationObserver to chat target root");

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.observer.observe(root, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        this.scanExisting(root);
    }

    /**
     * Check whether a response turn is marked settled.
     */
    public isSettled(id: string): boolean {
        return this.settledResponses.has(id);
    }

    /**
     * Disconnect MutationObserver and clear all active debounce and silence timers.
     */
    public disconnect(): void {
        this.destroyed = true;
        this.logger.debug("Disconnecting DOM observer and clearing debounce timers");
        this.observer?.disconnect();
        this.observer = null;
        for (const timer of this.pendingDebounceTimers.values()) {
            clearTimeout(timer);
        }
        this.pendingDebounceTimers.clear();
        this.discoveredResponses.clear();
        this.settledResponses.clear();
    }

    private isElement(node: unknown): node is HTMLElement {
        if (!node || typeof node !== "object") return false;
        if (typeof HTMLElement !== "undefined" && node instanceof HTMLElement) return true;
        return (node as { nodeType?: number }).nodeType === 1;
    }

    private scanExisting(root: Node): void {
        const queryable = root as unknown as { querySelectorAll?: (selector: string) => Iterable<HTMLElement> };
        if (typeof queryable?.querySelectorAll !== "function") return;
        const elements = queryable.querySelectorAll(DUCKAI_SELECTORS.ASSISTANT_MESSAGE);
        const elementList = Array.from(elements);
        this.logger.debug(`Initial scan found ${elementList.length} assistant message element(s)`);
        elementList.forEach((el) => this.processResponseElement(el));
    }

    private handleMutations(mutations: MutationRecord[]): void {
        if (this.destroyed) return;
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (this.isElement(node)) {
                        if (typeof node.matches === "function" && node.matches(DUCKAI_SELECTORS.ASSISTANT_MESSAGE)) {
                            this.processResponseElement(node);
                        } else {
                            const nested = typeof node.querySelectorAll === "function"
                                ? node.querySelectorAll<HTMLElement>(DUCKAI_SELECTORS.ASSISTANT_MESSAGE)
                                : [];
                            if (nested.length > 0) {
                                nested.forEach((m) => this.processResponseElement(m));
                            } else if (typeof node.closest === "function") {
                                const parentMessage = node.closest<HTMLElement>(DUCKAI_SELECTORS.ASSISTANT_MESSAGE);
                                if (parentMessage) {
                                    this.processResponseElement(parentMessage);
                                }
                            }
                        }
                    }
                });

                mutation.removedNodes.forEach((node) => {
                    if (this.isElement(node)) {
                        if (typeof node.matches === "function" && node.matches(DUCKAI_SELECTORS.ASSISTANT_MESSAGE)) {
                            this.handleResponseRemoved(node);
                        } else if (typeof node.querySelectorAll === "function") {
                            const nested = node.querySelectorAll<HTMLElement>(DUCKAI_SELECTORS.ASSISTANT_MESSAGE);
                            nested.forEach((m) => this.handleResponseRemoved(m));
                        }
                    }
                });
            } else if (mutation.type === "characterData") {
                const target = mutation.target.parentElement;
                if (target && typeof target.closest === "function") {
                    const message = target.closest<HTMLElement>(DUCKAI_SELECTORS.ASSISTANT_MESSAGE);
                    if (message) {
                        this.processResponseElement(message);
                    }
                }
            }
        }
    }

    private isStopGeneratingActive(): boolean {
        if (typeof document === "undefined") return false;
        const stopBtn = document.querySelector<HTMLButtonElement>(DUCKAI_SELECTORS.STOP_GENERATING_BUTTON);
        if (!stopBtn) return false;
        return !stopBtn.disabled;
    }

    private processResponseElement(el: HTMLElement, isInitialScan = false): void {
        if (this.destroyed) return;

        const id = this.resolveId(el);
        if (!id || id.startsWith("heading-")) return;
        if (this.settledResponses.has(id)) return;

        let responseRef = this.discoveredResponses.get(id);
        if (!responseRef) {
            responseRef = {
                id,
                element: el,
                isSettled: false,
            };
            this.discoveredResponses.set(id, responseRef);
            this.logger.debug(`Assistant response message discovered: #${id}`);
            this.callbacks.onResponseDiscovered(responseRef);
        }

        const isGenerating = this.isStopGeneratingActive();

        // Structural settlement indicator: message actions bar mounted beneath response,
        // provided the stream is not actively generating with a stop button.
        const hasActions = el.querySelector(DUCKAI_SELECTORS.MESSAGE_ACTIONS) !== null;
        if (hasActions && !isGenerating) {
            this.logger.debug(`Response #${id} has message-actions container and is not generating; marking settled`);
            this.markSettled(responseRef);
            return;
        }

        // Response is in-flight / streaming
        const existingTimer = this.pendingDebounceTimers.get(id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const microTimer = setTimeout(() => {
            if (this.destroyed || this.settledResponses.has(id)) return;
            this.callbacks.onResponseStreaming(responseRef!);

            const silenceTimer = setTimeout(() => {
                if (this.destroyed || this.settledResponses.has(id)) return;
                if (this.isStopGeneratingActive()) {
                    // Still generating, reset silence timer for another cycle
                    this.processResponseElement(el, false);
                    return;
                }
                this.logger.debug(
                    `Silence window elapsed (${this.settlementTimeoutMs}ms) for response #${id}, marking settled`,
                );
                this.markSettled(responseRef!);
            }, this.settlementTimeoutMs);

            this.pendingDebounceTimers.set(id, silenceTimer);
        }, this.microDebounceMs);

        this.pendingDebounceTimers.set(id, microTimer);
    }

    private markSettled(response: DuckAiResponseRef): void {
        const timer = this.pendingDebounceTimers.get(response.id);
        if (timer) clearTimeout(timer);
        this.pendingDebounceTimers.delete(response.id);

        response.isSettled = true;
        this.settledResponses.add(response.id);
        this.callbacks.onResponseSettled(response);
    }

    private handleResponseRemoved(el: HTMLElement): void {
        const id = el.id || el.getAttribute("id");
        if (!id) return;
        const timer = this.pendingDebounceTimers.get(id);
        if (timer) clearTimeout(timer);
        this.pendingDebounceTimers.delete(id);
        this.discoveredResponses.delete(id);
        this.settledResponses.delete(id);
        this.callbacks.onResponseRemoved?.(id);
    }

    private resolveId(el: HTMLElement): string {
        if (el.id) return el.id;
        const attrId = el.getAttribute("id");
        if (attrId) return attrId;
        const fallbackId = `duckai-response-${++this.fallbackIdCounter}`;
        el.setAttribute("id", fallbackId);
        return fallbackId;
    }
}
