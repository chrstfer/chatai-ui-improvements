import { EXTENSION_INJECTED, GEMINI_SELECTORS } from "./selectors.ts";
import { GeminiScraper } from "./scraper.ts";
import type { GeminiCodeBlockRef } from "./types.ts";
import { createLogger } from "../../core/logging/index.ts";

export interface ObserverCallbacks {
    onBlockDiscovered: (block: GeminiCodeBlockRef) => void;
    onBlockStreaming: (block: GeminiCodeBlockRef) => void;
    onBlockSettled: (block: GeminiCodeBlockRef) => void;
}

export class GeminiDOMObserver {
    private logger = createLogger("Gemini > Observer");
    private observer: MutationObserver | null = null;
    private scraper = new GeminiScraper();
    private callbacks: ObserverCallbacks;
    private pendingDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
    private settledBlocks = new Set<string>();

    private readonly MICRO_DEBOUNCE_MS = 200;
    private readonly MACRO_SETTLE_SILENCE_MS = 350;

    constructor(callbacks: ObserverCallbacks) {
        this.callbacks = callbacks;
    }

    public observe(targetNode: Node = document.body): void {
        this.disconnect();

        this.logger.debug("Attaching MutationObserver to target root");

        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });

        this.observer.observe(targetNode, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        this.scanExisting(targetNode);
    }

    private scanExisting(root: Node): void {
        if (!(root instanceof HTMLElement)) return;
        const blocks = root.querySelectorAll<HTMLElement>(GEMINI_SELECTORS.CODE_BLOCK);
        this.logger.debug(`Initial scan found ${blocks.length} <code-block> element(s)`);
        blocks.forEach((el) => this.processCodeBlockElement(el));
    }

    private handleMutations(mutations: MutationRecord[]): void {
        for (const mutation of mutations) {
            if (mutation.type === "childList") {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        if (node.matches(GEMINI_SELECTORS.CODE_BLOCK)) {
                            this.processCodeBlockElement(node);
                        } else {
                            const nested = node.querySelectorAll<HTMLElement>(GEMINI_SELECTORS.CODE_BLOCK);
                            nested.forEach((b) => this.processCodeBlockElement(b));
                        }
                    }
                });
            } else if (mutation.type === "characterData") {
                const target = mutation.target.parentElement;
                const codeBlock = target?.closest<HTMLElement>(GEMINI_SELECTORS.CODE_BLOCK);
                if (codeBlock) {
                    this.processCodeBlockElement(codeBlock);
                }
            }
        }
    }

    private processCodeBlockElement(el: HTMLElement): void {
        const block = this.scraper.parseCodeBlock(el);
        if (!block) return;

        if (this.settledBlocks.has(block.id)) return;

        if (!el.hasAttribute(EXTENSION_INJECTED.PROCESSED_ATTR)) {
            el.setAttribute(EXTENSION_INJECTED.PROCESSED_ATTR, "true");
            this.logger.debug(`Marked block #${block.id} as processed (${EXTENSION_INJECTED.PROCESSED_ATTR})`);
            this.callbacks.onBlockDiscovered(block);
        }

        if (block.isSettled) {
            this.logger.debug(`Block #${block.id} detected as already settled by turn status`);
            this.markSettled(block);
            return;
        }

        const existingTimer = this.pendingDebounceTimers.get(block.id);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
            this.callbacks.onBlockStreaming(block);

            const silenceTimer = setTimeout(() => {
                this.logger.debug(
                    `Silence elapsed (${this.MACRO_SETTLE_SILENCE_MS}ms) for block #${block.id}, triggering macro-settle`,
                );
                this.markSettled(block);
            }, this.MACRO_SETTLE_SILENCE_MS);

            this.pendingDebounceTimers.set(block.id, silenceTimer);
        }, this.MICRO_DEBOUNCE_MS);

        this.pendingDebounceTimers.set(block.id, timer);
    }

    private markSettled(block: GeminiCodeBlockRef): void {
        const timer = this.pendingDebounceTimers.get(block.id);
        if (timer) clearTimeout(timer);
        this.pendingDebounceTimers.delete(block.id);

        block.isSettled = true;
        this.settledBlocks.add(block.id);
        this.callbacks.onBlockSettled(block);
    }

    public disconnect(): void {
        this.logger.debug("Disconnecting DOM observer and clearing debounce timers");
        this.observer?.disconnect();
        this.observer = null;
        for (const timer of this.pendingDebounceTimers.values()) {
            clearTimeout(timer);
        }
        this.pendingDebounceTimers.clear();
        this.settledBlocks.clear();
    }
}
