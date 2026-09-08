/**
 * In-memory AST Cache with Least-Recently-Used (LRU) eviction.
 * Stores parsed AST trees keyed by 32-bit FNV-1a content hash and language type ("org").
 *
 * Provides 0ms instant hydration when virtual scrollers recycle chat DOM elements.
 * 100% pure TypeScript with zero external or DOM dependencies.
 */

export interface AstCacheEntry<T = unknown> {
    hash: number;
    type: string;
    ast: T;
    timestamp: number;
}

export class AstCache {
    private cache = new Map<string, AstCacheEntry<unknown>>();
    private readonly capacity: number;

    constructor(capacity = 200) {
        this.capacity = capacity;
    }

    private makeKey(hash: number, type: string): string {
        return `${type.toLowerCase()}:${hash}`;
    }

    /**
     * Retrieves an AST tree by hash and type, marking it as most recently used.
     */
    public get<T = unknown>(hash: number, type: string): T | undefined {
        const key = this.makeKey(hash, type);
        const entry = this.cache.get(key);
        if (entry !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, entry);
            return entry.ast as T;
        }
        return undefined;
    }

    /**
     * Retrieves the complete cache entry including timestamp.
     */
    public getEntry<T = unknown>(
        hash: number,
        type: string,
    ): AstCacheEntry<T> | undefined {
        const key = this.makeKey(hash, type);
        const entry = this.cache.get(key);
        if (entry !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, entry);
            return entry as AstCacheEntry<T>;
        }
        return undefined;
    }

    /**
     * Stores or updates an AST in the cache.
     * Evicts the least recently used entry if capacity is reached.
     */
    public set<T = unknown>(hash: number, type: string, ast: T): void {
        const key = this.makeKey(hash, type);
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, {
            hash,
            type: type.toLowerCase(),
            ast,
            timestamp: Date.now(),
        });
    }

    public has(hash: number, type: string): boolean {
        return this.cache.has(this.makeKey(hash, type));
    }

    public delete(hash: number, type: string): boolean {
        return this.cache.delete(this.makeKey(hash, type));
    }

    public clear(): void {
        this.cache.clear();
    }

    public get size(): number {
        return this.cache.size;
    }

    public get maxCapacity(): number {
        return this.capacity;
    }
}

/** Global default in-memory AST cache singleton with capacity 200 */
export const defaultAstCache = new AstCache(200);
