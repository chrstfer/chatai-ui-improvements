/**
 * Centralized Chat Adapter Registry.
 * Manages host-specific site adapter definitions and asynchronous dynamic loading.
 */

import type { ChatAdapterDefinition, SiteAdapter } from "../contracts/chats/index.ts";

export class ChatAdapterRegistry {
    private definitions = new Map<string, ChatAdapterDefinition>();
    private loadedInstances = new Map<string, SiteAdapter>();

    public register(item: ChatAdapterDefinition | SiteAdapter): void {
        if ("load" in item && typeof item.load === "function") {
            this.definitions.set(item.id.toLowerCase(), item);
            this.loadedInstances.delete(item.id.toLowerCase());
        } else {
            const adapter = item as SiteAdapter;
            this.loadedInstances.set(adapter.id.toLowerCase(), adapter);
            this.definitions.set(adapter.id.toLowerCase(), {
                id: adapter.id,
                name: adapter.name,
                matches: (url: URL) => adapter.matches(url),
                load: async () => adapter,
            });
        }
    }

    public registerLazy(definition: ChatAdapterDefinition): void {
        this.register(definition);
    }

    public unregister(id: string): boolean {
        const key = id.toLowerCase();
        const d1 = this.definitions.delete(key);
        const d2 = this.loadedInstances.delete(key);
        return d1 || d2;
    }

    public async get(id: string): Promise<SiteAdapter | undefined> {
        const key = id.toLowerCase();
        if (this.loadedInstances.has(key)) {
            return this.loadedInstances.get(key);
        }
        const def = this.definitions.get(key);
        if (def) {
            const instance = await def.load();
            this.loadedInstances.set(key, instance);
            return instance;
        }
        return undefined;
    }

    public async getAll(): Promise<SiteAdapter[]> {
        for (const id of this.definitions.keys()) {
            await this.get(id);
        }
        return Array.from(this.loadedInstances.values());
    }

    public hasMatching(url: URL | string): boolean {
        const parsed = typeof url === "string" ? new URL(url) : url;
        for (const def of this.definitions.values()) {
            try {
                if (def.matches(parsed)) return true;
            } catch {
                // ignore match evaluation error
            }
        }
        return false;
    }

    public findMatching(url: URL | string): SiteAdapter | undefined {
        const parsed = typeof url === "string" ? new URL(url) : url;
        for (const adapter of this.loadedInstances.values()) {
            try {
                if (adapter.matches(parsed)) return adapter;
            } catch {
                // ignore
            }
        }
        return undefined;
    }

    public async findAndLoad(
        url: URL | string,
        options?: { fresh?: boolean },
    ): Promise<SiteAdapter | undefined> {
        const parsed = typeof url === "string" ? new URL(url) : url;
        for (const def of this.definitions.values()) {
            try {
                if (def.matches(parsed)) {
                    const key = def.id.toLowerCase();
                    if (options?.fresh || !this.loadedInstances.has(key)) {
                        const loaded = await def.load();
                        this.loadedInstances.set(key, loaded);
                    }
                    return this.loadedInstances.get(key);
                }
            } catch {
                // ignore load/match error
            }
        }
        return undefined;
    }

    public unload(id: string): boolean {
        return this.loadedInstances.delete(id.toLowerCase());
    }

    public clear(): void {
        this.definitions.clear();
        this.loadedInstances.clear();
    }
}

export const defaultChatRegistry = new ChatAdapterRegistry();

// Lazy registration of Gemini adapter
defaultChatRegistry.register({
    id: "gemini",
    name: "Google Gemini",
    matches: (url) => url.hostname === "gemini.google.com",
    load: async () => {
        const { GeminiSiteAdapter } = await import("../features/chats/gemini/index.ts");
        return new GeminiSiteAdapter();
    },
});

// Lazy registration of DuckDuckGo AI adapter
defaultChatRegistry.register({
    id: "duckai",
    name: "DuckDuckGo AI",
    matches: (url) =>
        url.hostname === "duck.ai" ||
        (url.hostname === "duckduckgo.com" && url.pathname.startsWith("/chat")),
    load: async () => {
        const { DuckAiSiteAdapter } = await import("../features/chats/duckai/index.ts");
        return new DuckAiSiteAdapter();
    },
});
