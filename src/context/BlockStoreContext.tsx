/**
 * Preact Block Store Context & Persistent Content Fingerprint Cache
 * Caches ASTs and folding states across virtual DOM scroll lifecycles and manages global batch operations.
 */

import { ComponentChildren, createContext, FunctionComponent } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { OrgDocument } from "../languages/org/types/ast.ts";

export interface BlockCacheEntry {
    fingerprint: string;
    ast?: OrgDocument;
    isRendered: boolean;
    isFolded: boolean;
    lang: string;
    lineCount: number;
    timestamp: number;
}

export interface BlockRuntimeState {
    id: string;
    fingerprint: string;
    lang: string;
    isRendered: boolean;
    isFolded: boolean;
    allFolded: boolean;
    isConnected: boolean;
    mountEl?: HTMLElement;
    setRenderedState?: (rendered: boolean) => void;
    setFoldedState?: (folded: boolean) => void;
    setAllFoldedState?: (allFolded: boolean) => void;
}

/**
 * Fast $O(1)$ locally obvious content fingerprint algorithm.
 * Hashes language, length, prefix, and suffix without linear full-string traversal on large blocks.
 */
export function computeContentFingerprint(codeText: string, lang: string): string {
    const cleanLang = (lang || "unknown").toLowerCase();
    const len = codeText.length;
    const prefix = codeText.slice(0, 128);
    const suffix = len > 128 ? codeText.slice(-64) : "";
    const sample = `${cleanLang}:${len}:${prefix}:${suffix}`;

    // 32-bit FNV-1a hash
    let hash = 0x811c9dc5;
    for (let i = 0; i < sample.length; i++) {
        hash ^= sample.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

export class BlockStore {
    private cache = new Map<string, BlockCacheEntry>();
    private activeBlocks = new Map<string, BlockRuntimeState>();
    private listeners = new Set<() => void>();

    /**
     * Retrieves cached AST and state for a given content fingerprint
     */
    public getCached(fingerprint: string): BlockCacheEntry | undefined {
        return this.cache.get(fingerprint);
    }

    /**
     * Stores or updates cache for a given content fingerprint
     */
    public setCached(fingerprint: string, entry: Partial<BlockCacheEntry>): BlockCacheEntry {
        const existing = this.cache.get(fingerprint);
        const updated: BlockCacheEntry = {
            fingerprint,
            isRendered: entry.isRendered ?? existing?.isRendered ?? false,
            isFolded: entry.isFolded ?? existing?.isFolded ?? false,
            lang: entry.lang ?? existing?.lang ?? "org",
            lineCount: entry.lineCount ?? existing?.lineCount ?? 1,
            ast: entry.ast ?? existing?.ast,
            timestamp: Date.now(),
        };
        this.cache.set(fingerprint, updated);
        return updated;
    }

    /**
     * Registers a live runtime code block instance
     */
    public register(state: BlockRuntimeState): void {
        this.activeBlocks.set(state.id, state);
        this.notify();
    }

    /**
     * Unregisters a code block instance when its host DOM node is detached
     */
    public unregister(id: string): void {
        this.activeBlocks.delete(id);
        this.notify();
    }

    /**
     * Marks a block as detached during DOM mutations without wiping its cached AST
     */
    public markDetached(id: string): void {
        const active = this.activeBlocks.get(id);
        if (active) {
            active.isConnected = false;
            this.notify();
        }
    }

    public getActive(id: string): BlockRuntimeState | undefined {
        return this.activeBlocks.get(id);
    }

    public getAllActive(): BlockRuntimeState[] {
        return Array.from(this.activeBlocks.values());
    }

    public getAllCached(): BlockCacheEntry[] {
        return Array.from(this.cache.values());
    }

    /**
     * Global batch action: Toggles rendering across all registered Org blocks
     */
    public toggleRenderAll(forceState?: boolean): void {
        const blocks = this.getAllActive().filter((b) => b.lang === "org" && b.setRenderedState);
        if (blocks.length === 0) return;

        const targetState = typeof forceState === "boolean" ? forceState : blocks.some((b) => !b.isRendered);

        for (const block of blocks) {
            block.setRenderedState?.(targetState);
        }
        this.notify();
    }

    /**
     * Global batch action: Toggles folding across all registered blocks (Org and non-Org)
     */
    public toggleFoldAll(forceState?: boolean): void {
        const blocks = this.getAllActive();
        if (blocks.length === 0) return;

        // Check if any block is currently unfolded
        const targetFold = typeof forceState === "boolean"
            ? forceState
            : blocks.some((b) => !b.isFolded && !b.allFolded);

        for (const block of blocks) {
            if (block.lang === "org" && block.isRendered && block.setAllFoldedState) {
                block.setAllFoldedState(targetFold);
            } else if (block.setFoldedState) {
                block.setFoldedState(targetFold);
            }
        }
        this.notify();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

export const globalBlockStore = new BlockStore();

const BlockStoreContext = createContext<BlockStore>(globalBlockStore);

export interface BlockStoreProviderProps {
    store?: BlockStore;
    children?: ComponentChildren;
}

export const BlockStoreProvider: FunctionComponent<BlockStoreProviderProps> = ({
    store = globalBlockStore,
    children,
}) => {
    const [, setRevision] = useState(0);

    useEffect(() => {
        return store.subscribe(() => setRevision((r) => r + 1));
    }, [store]);

    return (
        <BlockStoreContext.Provider value={store}>
            {children}
        </BlockStoreContext.Provider>
    );
};

export function useBlockStore(): BlockStore {
    return useContext(BlockStoreContext);
}
