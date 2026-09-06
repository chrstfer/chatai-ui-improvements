import type { SiteAdapter } from "../core/contracts/index.ts";

export interface LazySiteAdapterDefinition {
    id: string;
    name: string;
    matches(url: URL): boolean;
    load(): Promise<SiteAdapter>;
}

export class ChatAdapterRegistry {
    private eagerAdapters = new Map<string, SiteAdapter>();
    private lazyAdapters = new Map<string, LazySiteAdapterDefinition>();
    private loadedInstances = new Map<string, SiteAdapter>();

    public register(adapter: SiteAdapter): void {
        this.eagerAdapters.set(adapter.id, adapter);
    }

    public registerLazy(definition: LazySiteAdapterDefinition): void {
        this.lazyAdapters.set(definition.id, definition);
    }

    public unregister(id: string): boolean {
        const r1 = this.eagerAdapters.delete(id);
        const r2 = this.lazyAdapters.delete(id);
        this.loadedInstances.delete(id);
        return r1 || r2;
    }

    public get(id: string): SiteAdapter | undefined {
        return this.eagerAdapters.get(id) || this.loadedInstances.get(id);
    }

    public getAll(): SiteAdapter[] {
        const all = new Map<string, SiteAdapter>();
        for (const [id, adapter] of this.eagerAdapters.entries()) {
            all.set(id, adapter);
        }
        for (const [id, adapter] of this.loadedInstances.entries()) {
            all.set(id, adapter);
        }
        return Array.from(all.values());
    }

    public hasMatching(url: URL | string): boolean {
        const parsed = typeof url === "string" ? new URL(url) : url;
        for (const adapter of this.eagerAdapters.values()) {
            try {
                if (adapter.matches(parsed)) return true;
            } catch {
                // ignore
            }
        }
        for (const def of this.lazyAdapters.values()) {
            try {
                if (def.matches(parsed)) return true;
            } catch {
                // ignore
            }
        }
        return false;
    }

    public findMatching(url: URL | string): SiteAdapter | undefined {
        const parsed = typeof url === "string" ? new URL(url) : url;
        for (const adapter of this.eagerAdapters.values()) {
            try {
                if (adapter.matches(parsed)) return adapter;
            } catch {
                // ignore
            }
        }
        for (const adapter of this.loadedInstances.values()) {
            try {
                if (adapter.matches(parsed)) return adapter;
            } catch {
                // ignore
            }
        }
        return undefined;
    }

    public async findAndLoad(url: URL | string): Promise<SiteAdapter | undefined> {
        const parsed = typeof url === "string" ? new URL(url) : url;

        // Check eager adapters
        const eagerMatch = this.findMatching(parsed);
        if (eagerMatch) return eagerMatch;

        // Check lazy adapters
        for (const def of this.lazyAdapters.values()) {
            try {
                if (def.matches(parsed)) {
                    if (!this.loadedInstances.has(def.id)) {
                        const loaded = await def.load();
                        this.loadedInstances.set(def.id, loaded);
                    }
                    return this.loadedInstances.get(def.id);
                }
            } catch {
                // ignore load/match error
            }
        }
        return undefined;
    }
}

export const defaultChatRegistry = new ChatAdapterRegistry();

// Lazy registration: Gemini chunk is emitted separately and loaded only on gemini.google.com
defaultChatRegistry.registerLazy({
    id: "gemini",
    name: "Google Gemini",
    matches: (url) => url.hostname === "gemini.google.com",
    load: async () => {
        const { GeminiSiteAdapter } = await import("./gemini/index.ts");
        return new GeminiSiteAdapter();
    },
});
