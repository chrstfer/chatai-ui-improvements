/**
 * Centralized Language Registry.
 * Manages pluggable language definitions, coordinates language resolution by hint or content,
 * supports outside-in lazy loading for code-splitting, and standardizes display names.
 */

import type { LanguageDefinition } from "../core/contracts/language.ts";
import { computeContentHash } from "../core/utils/contentHash.ts";
import { type AstCache, defaultAstCache } from "../store/astCache.ts";

export interface LazyLanguageDefinition {
    readonly id: string;
    readonly name: string;
    readonly aliases: readonly string[];
    matches(languageHint: string, firstLines: readonly string[]): boolean;
    load(): Promise<LanguageDefinition>;
}

export class LanguageRegistry {
    private definitions = new Map<string, LanguageDefinition>();
    private lazyDefinitions = new Map<string, LazyLanguageDefinition>();

    constructor() {}

    /**
     * Registers a loaded language definition.
     */
    public register(def: LanguageDefinition): void {
        this.definitions.set(def.id.toLowerCase(), def);
        this.lazyDefinitions.delete(def.id.toLowerCase());
    }

    /**
     * Registers a lazy language definition for dynamic loading.
     */
    public registerLazy(def: LazyLanguageDefinition): void {
        const key = def.id.toLowerCase();
        if (!this.definitions.has(key)) {
            this.lazyDefinitions.set(key, def);
        }
    }

    /**
     * Unregisters a language definition by ID.
     */
    public unregister(id: string): boolean {
        const key = id.toLowerCase();
        const d1 = this.definitions.delete(key);
        const d2 = this.lazyDefinitions.delete(key);
        return d1 || d2;
    }

    /**
     * Gets a registered language definition directly by ID.
     */
    public get(id: string): LanguageDefinition | undefined {
        return this.definitions.get(id.toLowerCase());
    }

    /**
     * Resolves an already-loaded language definition by explicit hint or alias.
     */
    public resolve(languageHint: string): LanguageDefinition | undefined {
        const clean = languageHint.trim().toLowerCase();
        if (!clean) return undefined;

        // Direct ID match
        const byId = this.definitions.get(clean);
        if (byId) return byId;

        // Alias match
        for (const def of this.definitions.values()) {
            if (def.aliases.some((alias) => alias.toLowerCase() === clean)) {
                return def;
            }
        }

        return undefined;
    }

    /**
     * Resolves a lazy language definition by explicit hint or alias.
     */
    public resolveLazy(languageHint: string): LazyLanguageDefinition | undefined {
        const clean = languageHint.trim().toLowerCase();
        if (!clean) return undefined;

        const byId = this.lazyDefinitions.get(clean);
        if (byId) return byId;

        for (const def of this.lazyDefinitions.values()) {
            if (def.aliases.some((alias) => alias.toLowerCase() === clean)) {
                return def;
            }
        }

        return undefined;
    }

    /**
     * Matches a loaded language definition using explicit hint and fallback inspection
     * of the first lines of raw content.
     */
    public matchContent(
        languageHint: string,
        firstLines: readonly string[],
    ): LanguageDefinition | undefined {
        const resolved = this.resolve(languageHint);
        if (resolved) return resolved;

        for (const def of this.definitions.values()) {
            if (def.matches(languageHint, firstLines)) {
                return def;
            }
        }

        return undefined;
    }

    /**
     * Matches a lazy language definition using explicit hint and fallback inspection
     * of the first lines of raw content.
     */
    public matchContentLazy(
        languageHint: string,
        firstLines: readonly string[],
    ): LazyLanguageDefinition | undefined {
        const resolved = this.resolveLazy(languageHint);
        if (resolved) return resolved;

        for (const def of this.lazyDefinitions.values()) {
            if (def.matches(languageHint, firstLines)) {
                return def;
            }
        }

        return undefined;
    }

    /**
     * Checks if a language matches either loaded or lazy registered definitions.
     */
    public hasLanguage(
        languageHint: string,
        firstLines: readonly string[] = [],
    ): boolean {
        return Boolean(
            this.resolve(languageHint) ||
                this.resolveLazy(languageHint) ||
                this.matchContent(languageHint, firstLines) ||
                this.matchContentLazy(languageHint, firstLines),
        );
    }

    /**
     * Asynchronously loads and resolves the matching language definition.
     * If already loaded, resolves immediately.
     */
    public async loadLanguage(
        languageHint: string,
        firstLines: readonly string[] = [],
    ): Promise<LanguageDefinition | undefined> {
        // First check loaded definitions
        const loaded = this.matchContent(languageHint, firstLines);
        if (loaded) return loaded;

        // Next check lazy definitions
        const lazy = this.matchContentLazy(languageHint, firstLines);
        if (lazy) {
            const def = await lazy.load();
            this.register(def);
            return def;
        }

        return undefined;
    }

    /**
     * Resolves the language definition for raw code text, computes its content hash,
     * and ensures the AST is parsed and stored in astCache during message settlement.
     *
     * Language-agnostic: delegates parsing to langDef.parse if present.
     */
    public settleContent<T = unknown>(
        rawText: string,
        languageHint: string,
        astCache: AstCache = defaultAstCache,
    ): { langDef?: LanguageDefinition; hash?: number; ast?: T } {
        const firstLines = rawText.split("\n").slice(0, 10);
        const langDef = this.resolve(languageHint) ??
            this.matchContent(languageHint, firstLines);
        if (!langDef) {
            return {};
        }

        if (typeof langDef.parse === "function") {
            const hash = computeContentHash(rawText, langDef.id);
            let ast = astCache.get<T>(hash, langDef.id);
            if (!ast) {
                ast = langDef.parse(rawText) as T;
                astCache.set(hash, langDef.id, ast);
            }
            return { langDef, hash, ast };
        }

        return { langDef };
    }

    /**
     * Formats a language hint into a standardized human-readable display label.
     */
    public formatDisplayName(languageHint: string): string {
        if (!languageHint || languageHint.trim() === "") return "CODE";
        const def = this.resolve(languageHint);
        if (def) return def.name.toUpperCase();
        const lazy = this.resolveLazy(languageHint);
        if (lazy) return lazy.name.toUpperCase();
        return languageHint.trim().toUpperCase();
    }

    /**
     * Returns all registered loaded language definitions.
     */
    public getAll(): LanguageDefinition[] {
        return Array.from(this.definitions.values());
    }

    /**
     * Clears all registered definitions (primarily for testing).
     */
    public clear(): void {
        this.definitions.clear();
        this.lazyDefinitions.clear();
    }
}

/** Global default language registry with lazy-loaded core language modules */
export const defaultLanguageRegistry: LanguageRegistry = new LanguageRegistry();

// Lazy registration of Org Mode: zero parser/view bytes until needed
defaultLanguageRegistry.registerLazy({
    id: "org",
    name: "Org Mode",
    aliases: ["org", "orgmode", "org-mode"],
    matches: (hint, firstLines) => {
        const clean = hint.trim().toLowerCase();
        if (["org", "orgmode", "org-mode"].includes(clean)) return true;
        return firstLines.some((l) => /^\*{1,6}\s+|^#\+(?:title|author|date|begin_)/i.test(l.trim()));
    },
    load: async () => {
        const { orgLanguageDefinition } = await import("./org/definition.ts");
        return orgLanguageDefinition;
    },
});
