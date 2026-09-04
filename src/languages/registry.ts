/**
 * Dynamic Language Registry & Language-to-Tool Mapping Engine
 * Provides alias normalization, language recognition, and per-language hotswappable tool indices.
 */

import { ToolbarTool } from "./org/components/OrgToolbar.tsx";
import { LanguageDefinition } from "./types.ts";

export class LanguageRegistry {
    private languages = new Map<string, LanguageDefinition>();
    private aliasMap = new Map<string, string>(); // alias (lowercase) -> canonical id
    private listeners = new Set<() => void>();

    constructor(initialLanguages?: LanguageDefinition[]) {
        if (initialLanguages) {
            for (const lang of initialLanguages) {
                this.register(lang);
            }
        }
    }

    /**
     * Registers a language definition and indexes all its aliases
     */
    public register(def: LanguageDefinition): void {
        const canonicalId = def.id.toLowerCase();
        this.languages.set(canonicalId, def);
        this.aliasMap.set(canonicalId, canonicalId);

        for (const alias of def.aliases) {
            this.aliasMap.set(alias.toLowerCase(), canonicalId);
        }

        this.notify();
    }

    /**
     * Unregisters a language and removes its alias mappings
     */
    public unregister(id: string): boolean {
        const canonicalId = id.toLowerCase();
        const def = this.languages.get(canonicalId);
        if (!def) return false;

        this.languages.delete(canonicalId);
        this.aliasMap.delete(canonicalId);

        for (const alias of def.aliases) {
            this.aliasMap.delete(alias.toLowerCase());
        }

        this.notify();
        return true;
    }

    /**
     * Resolves an alias, header label, or identifier to its canonical LanguageDefinition
     */
    public resolve(aliasOrId: string): LanguageDefinition | undefined {
        if (!aliasOrId) return undefined;
        const normalized = aliasOrId.trim().toLowerCase();
        const canonicalId = this.aliasMap.get(normalized);
        return canonicalId ? this.languages.get(canonicalId) : undefined;
    }

    /**
     * Checks if a language name, header decoration, or alias is recognized
     */
    public isKnown(aliasOrId: string): boolean {
        if (!aliasOrId) return false;
        return this.aliasMap.has(aliasOrId.trim().toLowerCase());
    }

    /**
     * Gets a language definition by its exact canonical ID
     */
    public get(id: string): LanguageDefinition | undefined {
        return this.languages.get(id.toLowerCase());
    }

    /**
     * Returns all registered language definitions
     */
    public getAll(): LanguageDefinition[] {
        return Array.from(this.languages.values());
    }

    /**
     * Returns a set of all registered language aliases
     */
    public getAllAliases(): Set<string> {
        return new Set(this.aliasMap.keys());
    }

    /**
     * Retrieves the specific tools mapped to a language
     */
    public getToolsForLanguage(aliasOrId: string): ToolbarTool[] {
        const lang = this.resolve(aliasOrId);
        return lang?.tools ? [...lang.tools] : [];
    }

    /**
     * Registers or dynamically attaches a tool specifically mapped to a language
     */
    public registerToolForLanguage(langIdOrAlias: string, tool: ToolbarTool): void {
        const lang = this.resolve(langIdOrAlias);
        if (lang) {
            if (!lang.tools) lang.tools = [];
            const idx = lang.tools.findIndex((t) => t.id === tool.id);
            if (idx >= 0) {
                lang.tools[idx] = tool;
            } else {
                lang.tools.push(tool);
            }
            this.notify();
        }
    }

    /**
     * Unregisters a specific tool from a language
     */
    public unregisterToolForLanguage(langIdOrAlias: string, toolId: string): boolean {
        const lang = this.resolve(langIdOrAlias);
        if (lang && lang.tools) {
            const idx = lang.tools.findIndex((t) => t.id === toolId);
            if (idx >= 0) {
                lang.tools.splice(idx, 1);
                this.notify();
                return true;
            }
        }
        return false;
    }

    /**
     * Subscribes to registry changes for live UI updates
     */
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
