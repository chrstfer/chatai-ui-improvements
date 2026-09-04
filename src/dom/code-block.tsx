/**
 * Code Block Lifecycle and In-Situ Preact Controller for Gemini UI
 * Encapsulates single-portal Preact mounting and AST caching behind a deep module interface.
 */

import { render } from "preact";
import {
    SELECTOR_ACTIONS,
    SELECTOR_CODE_CONTAINER,
    SELECTOR_DECORATION,
    SELECTOR_LANG_SPAN,
} from "../constants.ts";
import { BlockStore, globalBlockStore } from "../context/BlockStoreContext.tsx";
import { globalLanguageRegistry } from "../languages/index.ts";
import {
    globalToolbarRegistry,
    ToolbarToolRegistry,
} from "../languages/org/index.ts";
import { SettingsStore } from "../storage/settings-store.ts";
import { CodeBlockRecord } from "./dom.ts";
import { InSituCodeBlock } from "./InSituCodeBlock.tsx";

export class CodeBlockController {
    private registry = new Map<string, CodeBlockRecord>();
    private blockElements = new WeakMap<HTMLElement, string>();
    private store: SettingsStore;
    private blockStore: BlockStore;
    private toolbarRegistry: ToolbarToolRegistry;
    private blockIdCounter = 0;

    constructor(
        store: SettingsStore,
        toolbarRegistry: ToolbarToolRegistry = globalToolbarRegistry,
        blockStore: BlockStore = globalBlockStore,
    ) {
        this.store = store;
        this.toolbarRegistry = toolbarRegistry;
        this.blockStore = blockStore;
    }

    public getToolbarRegistry(): ToolbarToolRegistry {
        return this.toolbarRegistry;
    }

    public getBlockStore(): BlockStore {
        return this.blockStore;
    }

    public getRecord(id: string): CodeBlockRecord | undefined {
        return this.registry.get(id);
    }

    public getRecordByElement(blockEl: HTMLElement): CodeBlockRecord | undefined {
        const id = this.blockElements.get(blockEl) || blockEl.getAttribute("data-gemini-org-id");
        return id ? this.registry.get(id) : undefined;
    }

    public getAllRecords(): CodeBlockRecord[] {
        return Array.from(this.registry.values());
    }

    /**
     * Extracts the raw code text content from a code element
     */
    public extractCodeText(codeEl: HTMLElement): string {
        return (codeEl.textContent || codeEl.innerText || "").replace(/\r\n/g, "\n");
    }

    /**
     * Mounts the In-Situ Preact root container adjacent to the raw pre element
     */
    private createMountContainer(blockId: string, preEl: HTMLElement): HTMLElement {
        const mount = document.createElement("div");
        mount.className = "orgmod-in-situ-root";
        mount.setAttribute("data-gemini-org", "in-situ-root");
        mount.setAttribute("data-gemini-org-block-id", blockId);

        if (preEl.parentNode) {
            preEl.parentNode.insertBefore(mount, preEl.nextSibling);
        }

        return mount;
    }

    /**
     * Locates the header actions container for portal toolbar projection
     */
    private findHeaderActions(headerEl: HTMLElement | null): HTMLElement | null {
        if (!headerEl) return null;

        const actionsContainer = headerEl.querySelector<HTMLElement>(SELECTOR_ACTIONS);
        if (actionsContainer) return actionsContainer;

        const iconBtn = headerEl.querySelector("gem-icon-button, button, [role='button']");
        if (iconBtn && iconBtn.parentElement) {
            return iconBtn.parentElement;
        }

        return headerEl;
    }

    /**
     * Renders the InSituCodeBlock Preact component tree
     */
    private renderBlock(record: CodeBlockRecord, headerActionsEl: HTMLElement | null): void {
        render(
            <InSituCodeBlock
                blockId={record.id}
                lang={record.lang || "org"}
                codeText={record.lastText}
                preEl={record.preEl}
                headerActionsEl={headerActionsEl}
                blockStore={this.blockStore}
                autoRender={this.store.settings.autoRenderOrg}
            />,
            record.mountEl,
        );
    }

    /**
     * Handles live streaming content updates for an already registered code block
     */
    public handleStreamingUpdate(record: CodeBlockRecord, currentText: string): void {
        if (record.lastText === currentText) return;
        record.lastText = currentText;

        const headerEl = record.blockEl.querySelector<HTMLElement>(SELECTOR_DECORATION);
        const headerActionsEl = this.findHeaderActions(headerEl);

        this.renderBlock(record, headerActionsEl);
    }

    /**
     * Toggles rendering across all registered Org blocks
     */
    public toggleRenderAll(forceState?: boolean): void {
        this.blockStore.toggleRenderAll(forceState);
    }

    /**
     * Toggles fold/expand across all currently registered blocks
     */
    public toggleFoldAll(forceState?: boolean): void {
        this.blockStore.toggleFoldAll(forceState);
    }

    /**
     * Unmounts and cleans up a specific code block
     */
    public unmount(blockEl: HTMLElement): void {
        const record = this.getRecordByElement(blockEl);
        if (!record) return;

        render(null, record.mountEl);
        record.mountEl.remove();

        this.registry.delete(record.id);
        this.blockElements.delete(blockEl);
        this.blockStore.unregister(record.id);
    }

    /**
     * Handles nodes removed from DOM during virtual scrolling or chat navigation
     */
    public handleRemovedNodes(nodes: NodeList | Node[]): void {
        for (const node of Array.from(nodes)) {
            if (node instanceof HTMLElement) {
                if (node.hasAttribute("data-gemini-org-id")) {
                    this.unmount(node);
                } else {
                    const nested = node.querySelectorAll<HTMLElement>("[data-gemini-org-id]");
                    for (const el of Array.from(nested)) {
                        this.unmount(el);
                    }
                }
            }
        }
    }

    /**
     * Prunes disconnected DOM nodes to prevent memory leaks during SPA navigation
     */
    public prune(): void {
        for (const [id, record] of this.registry.entries()) {
            if (!record.blockEl.isConnected) {
                render(null, record.mountEl);
                record.mountEl.remove();
                this.registry.delete(id);
                this.blockElements.delete(record.blockEl);
                this.blockStore.unregister(id);
            }
        }
    }

    /**
     * Registers and mounts a code block into the controller lifecycle
     */
    public process(blockEl: HTMLElement): CodeBlockRecord | undefined {
        if (!blockEl || typeof blockEl.querySelector !== "function") return undefined;

        // Check if block is already registered
        const existingRecord = this.getRecordByElement(blockEl);
        if (existingRecord) {
            const currentText = this.extractCodeText(existingRecord.codeEl);
            this.handleStreamingUpdate(existingRecord, currentText);
            return existingRecord;
        }

        // Locate code container and header using canonical selectors
        const codeEl = blockEl.querySelector<HTMLElement>(SELECTOR_CODE_CONTAINER) ||
            blockEl.querySelector<HTMLElement>("code") ||
            blockEl.querySelector<HTMLElement>("pre") ||
            blockEl;
        const preEl = blockEl.querySelector<HTMLElement>("pre") || blockEl;
        const headerEl = blockEl.querySelector<HTMLElement>(SELECTOR_DECORATION);
        const currentText = this.extractCodeText(codeEl);

        // Assign Unique Block ID
        this.blockIdCounter++;
        const blockId = `code-block-${this.blockIdCounter}`;

        blockEl.setAttribute("data-gemini-org", "root");
        blockEl.setAttribute("data-gemini-org-id", blockId);

        // Create Single In-Situ Mount Container
        const mountEl = this.createMountContainer(blockId, preEl);

        // Extract language from header decoration or default to org
        const langSpan = headerEl?.querySelector<HTMLElement>(SELECTOR_LANG_SPAN);
        const rawLang = langSpan?.textContent?.trim() || "";
        const langDef = globalLanguageRegistry.resolve(rawLang);
        const lang = langDef ? langDef.id : (rawLang.toLowerCase() || "org");

        const record: CodeBlockRecord = {
            id: blockId,
            blockEl,
            preEl,
            codeEl,
            mountEl,
            isRendered: false,
            allFolded: false,
            lastText: currentText,
            lang,
        };

        this.registry.set(blockId, record);
        this.blockElements.set(blockEl, blockId);

        // Mount single Preact root
        const headerActionsEl = this.findHeaderActions(headerEl);
        this.renderBlock(record, headerActionsEl);

        return record;
    }
}
