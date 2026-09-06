import type { SiteAdapter } from "../core/contracts/index.ts";
import { GeminiSiteAdapter } from "./gemini/index.ts";

export class ChatAdapterRegistry {
    private adapters = new Map<string, SiteAdapter>();

    /**
     * Registers a site adapter. If an adapter with the same ID already exists, it is replaced.
     */
    public register(adapter: SiteAdapter): void {
        this.adapters.set(adapter.id, adapter);
    }

    /**
     * Unregisters an adapter by ID.
     */
    public unregister(id: string): boolean {
        return this.adapters.delete(id);
    }

    /**
     * Retrieves an adapter by its unique ID.
     */
    public get(id: string): SiteAdapter | undefined {
        return this.adapters.get(id);
    }

    /**
     * Returns all currently registered adapters.
     */
    public getAll(): SiteAdapter[] {
        return Array.from(this.adapters.values());
    }

    /**
     * Finds the first adapter that matches the given URL.
     */
    public findMatching(url: URL | string): SiteAdapter | undefined {
        const parsedUrl = typeof url === "string" ? new URL(url) : url;
        for (const adapter of this.adapters.values()) {
            try {
                if (adapter.matches(parsedUrl)) {
                    return adapter;
                }
            } catch {
                // Ignore adapter match evaluation errors
            }
        }
        return undefined;
    }
}

/**
 * Pre-configured registry instance containing built-in adapters.
 */
export const defaultChatRegistry = new ChatAdapterRegistry();
defaultChatRegistry.register(new GeminiSiteAdapter());
