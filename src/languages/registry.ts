/**
 * Centralized Language Registry.
 * Manages pluggable language definitions, coordinates language resolution by hint or content,
 * and standardizes display names across toolbars and badges.
 */

import type { LanguageDefinition } from "../core/contracts/language.ts";
import { computeContentHash } from "../core/utils/contentHash.ts";
import { type AstCache, defaultAstCache } from "../store/astCache.ts";
import { orgLanguageDefinition } from "./org/definition.ts";

export class LanguageRegistry {
    private definitions = new Map<string, LanguageDefinition>();

    constructor() {}

    /**
     * Registers a language definition.
     */
    public register(def: LanguageDefinition): void {
        this.definitions.set(def.id.toLowerCase(), def);
    }

    /**
     * Unregisters a language definition by ID.
     */
    public unregister(id: string): boolean {
        return this.definitions.delete(id.toLowerCase());
    }

    /**
     * Resolves a language definition by explicit hint or alias.
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
     * Matches a language definition using both explicit hint and fallback inspection
     * of the first lines of raw content.
     */
    public matchContent(
        languageHint: string,
        firstLines: readonly string[],
    ): LanguageDefinition | undefined {
        // First check explicit hint
        const resolved = this.resolve(languageHint);
        if (resolved) return resolved;

        // Fallback to match heuristic across registered languages
        for (const def of this.definitions.values()) {
            if (def.matches(languageHint, firstLines)) {
                return def;
            }
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
        return languageHint.trim().toUpperCase();
    }

    /**
     * Returns all registered language definitions.
     */
    public getAll(): LanguageDefinition[] {
        return Array.from(this.definitions.values());
    }

    /**
     * Clears all registered definitions (primarily for testing).
     */
    public clear(): void {
        this.definitions.clear();
    }
}

/** Global default language registry pre-loaded with core language modules */
export const defaultLanguageRegistry: LanguageRegistry = new LanguageRegistry();
defaultLanguageRegistry.register(orgLanguageDefinition);
