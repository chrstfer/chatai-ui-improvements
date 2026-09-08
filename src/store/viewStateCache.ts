export type ViewMode = "rendered" | "raw";

export interface CodeBlockViewState {
    isFolded: boolean;
    viewMode: ViewMode;
}

/**
 * In-memory Least-Recently-Used (LRU) cache preserving user code block view states
 * (folded state and active view mode) across virtual scroller DOM unmounts and remounts.
 * Keyed by deterministic content hashes.
 */
export class ViewStateCache {
    private cache = new Map<string, CodeBlockViewState>();
    private capacity: number;

    constructor(capacity = 500) {
        this.capacity = capacity;
    }

    /**
     * Retrieves view state for a given hash and marks it as most recently used.
     */
    public get(hash: string): CodeBlockViewState | undefined {
        const state = this.cache.get(hash);
        if (state !== undefined) {
            this.cache.delete(hash);
            this.cache.set(hash, state);
        }
        return state;
    }

    /**
     * Stores or updates the view state for a given hash.
     * Evicts the oldest entry if capacity is reached.
     */
    public set(hash: string, state: CodeBlockViewState): void {
        if (this.cache.has(hash)) {
            this.cache.delete(hash);
        } else if (this.cache.size >= this.capacity) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(hash, state);
    }

    public has(hash: string): boolean {
        return this.cache.has(hash);
    }

    public delete(hash: string): boolean {
        return this.cache.delete(hash);
    }

    public clear(): void {
        this.cache.clear();
    }

    public get size(): number {
        return this.cache.size;
    }
}

/** Default global cache instance with 500 items capacity */
export const defaultViewStateCache: ViewStateCache = new ViewStateCache(500);
