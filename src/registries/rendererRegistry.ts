/**
 * Centralized Renderer Registry.
 * Manages document view presentation components and outside-in lazy loading.
 * Indexed by canonical formatId.
 */

import type { LazyRendererDefinition, Renderer } from "../contracts/features/renderers/index.ts";
import { defaultMatcherRegistry } from "./matcherRegistry.ts";

export class RendererRegistry {
    private definitions = new Map<string, Renderer>();
    private lazyDefinitions = new Map<string, LazyRendererDefinition>();

    public register(renderer: Renderer): void {
        this.definitions.set(renderer.id.toLowerCase(), renderer);
        this.lazyDefinitions.delete(renderer.id.toLowerCase());
    }

    public registerLazy(definition: LazyRendererDefinition): void {
        const key = definition.formatId.toLowerCase();
        if (!this.definitions.has(key)) {
            this.lazyDefinitions.set(key, definition);
        }
    }

    public unregister(formatId: string): boolean {
        const key = formatId.toLowerCase();
        const d1 = this.definitions.delete(key);
        const d2 = this.lazyDefinitions.delete(key);
        return d1 || d2;
    }

    /**
     * Synchronously checks whether a renderer is registered (loaded or lazy).
     */
    public has(formatId: string): boolean {
        const key = formatId.toLowerCase();
        return this.definitions.has(key) || this.lazyDefinitions.has(key);
    }

    /**
     * Asynchronously loads and returns the renderer for the canonical formatId.
     */
    public async get(formatId: string): Promise<Renderer | undefined> {
        const key = formatId.toLowerCase();
        if (this.definitions.has(key)) return this.definitions.get(key);
        const lazy = this.lazyDefinitions.get(key);
        if (lazy) {
            const loaded = await lazy.load();
            this.definitions.set(key, loaded);
            return loaded;
        }
        return undefined;
    }

    /**
     * Fallback resolver: matches hint/content via MatcherRegistry then loads renderer.
     */
    public async findAndLoad(
        hint: string,
        firstLines: readonly string[] = [],
    ): Promise<Renderer | undefined> {
        const direct = await this.get(hint);
        if (direct) return direct;

        const format = defaultMatcherRegistry.findMatching(hint, firstLines);
        if (format) {
            return await this.get(format.id);
        }

        return undefined;
    }

    public clear(): void {
        this.definitions.clear();
        this.lazyDefinitions.clear();
    }
}

export const defaultRendererRegistry = new RendererRegistry();

// Lazy registration of Org Mode DocumentView
defaultRendererRegistry.registerLazy({
    formatId: "org",
    load: async () => {
        const { OrgDocumentView } = await import("../features/renderers/org/OrgDocumentView.tsx");
        return {
            id: "org",
            name: "Org Mode",
            view: OrgDocumentView,
        };
    },
});
