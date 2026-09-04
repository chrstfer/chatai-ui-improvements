/**
 * DOM Scanner and MutationObserver with Shadow DOM Support & Universal Code Block Discovery
 */

import {
    SELECTOR_CODE_CONTAINER,
    SELECTOR_ROOT,
} from "../constants.ts";
import { CodeBlockController } from "./code-block.tsx";

export class DomObserver {
    private controller: CodeBlockController;
    private observer: MutationObserver | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private static readonly EXPLICIT_ORG_RE = /\b(?:org|org-mode|orgmode)\b/i;

    constructor(controller: CodeBlockController) {
        this.controller = controller;
    }

    /**
     * Inspects a candidate code block element.
     * All code blocks (Org and standard languages) qualify for universal in-situ wrapping.
     */
    private shouldProcessBlock(blockEl: HTMLElement): boolean {
        // If block is already registered, let controller handle streaming updates
        if (this.controller.getRecordByElement(blockEl)) {
            return true;
        }

        // Verify that this element has genuine code container or pre content
        const codeEl = blockEl.querySelector<HTMLElement>(SELECTOR_CODE_CONTAINER) ||
            blockEl.querySelector<HTMLElement>("code") ||
            blockEl.querySelector<HTMLElement>("pre") ||
            blockEl;
        const codeText = (codeEl.textContent || codeEl.innerText || "").replace(/\r\n/g, "\n");

        if (!codeText.trim()) return false;

        return true;
    }

    /**
     * Traverses a root node and any nested shadow DOMs to discover code blocks
     */
    private scanSubtree(targetRoot: ParentNode): void {
        const candidates = targetRoot.querySelectorAll<HTMLElement>(SELECTOR_ROOT);
        const discoveredBlocks: HTMLElement[] = [];

        for (const block of Array.from(candidates)) {
            if (this.shouldProcessBlock(block)) {
                block.setAttribute("data-code-processed", "true");
                this.controller.process(block);
                discoveredBlocks.push(block);
            }
        }

        // Log discovered code blocks to extension console with page context
        if (discoveredBlocks.length > 0) {
            const pageTitle = typeof document !== "undefined" ? document.title : "";
            const pageUrl = typeof location !== "undefined" ? location.href : "";
            console.log(
                `[GeminiOrgMod] Discovered ${discoveredBlocks.length} code block(s) on "${pageTitle}" (${pageUrl}):`,
                discoveredBlocks,
            );
        }

        // Traverse open Shadow DOMs
        const customElements = targetRoot.querySelectorAll<HTMLElement>("*");
        for (const el of Array.from(customElements)) {
            if (el.shadowRoot) {
                this.scanSubtree(el.shadowRoot);
            }
        }
    }

    /**
     * Scans the document or specified root node for code blocks
     */
    public scan(root?: Node): void {
        if (typeof document === "undefined") return;

        const targetRoot = (root || document.body) as ParentNode;
        if (!targetRoot || typeof targetRoot.querySelectorAll !== "function") return;

        // Prune disconnected DOM records
        this.controller.prune();

        this.scanSubtree(targetRoot);
    }

    /**
     * Starts observing DOM mutations for dynamic streaming and SPA navigation
     */
    public start(): void {
        if (
            typeof document === "undefined" ||
            !document.body ||
            typeof MutationObserver === "undefined"
        ) {
            return;
        }

        // Initial scan
        this.scan();

        this.observer = new MutationObserver((mutations) => {
            let needsScan = false;
            for (const m of mutations) {
                if (m.removedNodes.length > 0) {
                    this.controller.handleRemovedNodes(m.removedNodes);
                }

                if (m.addedNodes.length > 0 || m.removedNodes.length > 0 || m.type === "characterData") {
                    needsScan = true;
                }
            }

            if (needsScan) {
                if (this.debounceTimer) clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => this.scan(), 80);
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });
    }

    /**
     * Stops the MutationObserver and clears timers
     */
    public stop(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}
