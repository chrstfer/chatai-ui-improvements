/**
 * Centralized Parser Registry.
 * Manages headless AST parsers and coordinates stream settlement caching.
 * Indexed by canonical formatId.
 */

import type { LazyParserDefinition, Parser } from "@internal/contracts/features/parsers";
import { computeContentHash } from "@internal/core/utils";
import { type AstCache, defaultAstCache } from "@internal/store";

export class ParserRegistry {
    private definitions = new Map<string, Parser>();
    private lazyDefinitions = new Map<string, LazyParserDefinition>();

    public register(parser: Parser): void {
        this.definitions.set(parser.id.toLowerCase(), parser);
        this.lazyDefinitions.delete(parser.id.toLowerCase());
    }

    public registerLazy(definition: LazyParserDefinition): void {
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
     * Synchronously checks whether a parser is registered (loaded or lazy).
     */
    public has(formatId: string): boolean {
        const key = formatId.toLowerCase();
        return this.definitions.has(key) || this.lazyDefinitions.has(key);
    }

    /**
     * Asynchronously loads and returns the parser for the canonical formatId.
     */
    public async get(formatId: string): Promise<Parser | undefined> {
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
     * Coordinates AST settlement for canonical formatId.
     * Direct O(1) cache check and parser lookup without rematching.
     */
    public async settleContent<T = unknown>(
        rawText: string,
        formatId: string,
        astCache: AstCache = defaultAstCache,
    ): Promise<{ parser?: Parser; hash?: number; ast?: T }> {
        const parser = await this.get(formatId);
        if (!parser) {
            return {};
        }

        const hash = computeContentHash(rawText, parser.id);
        let ast = astCache.get<T>(hash, parser.id);
        if (!ast) {
            ast = parser.parse(rawText) as T;
            astCache.set(hash, parser.id, ast);
        }
        return { parser, hash, ast };
    }

    public clear(): void {
        this.definitions.clear();
        this.lazyDefinitions.clear();
    }
}

export const defaultParserRegistry = new ParserRegistry();

// Lazy registration of Org Mode parser
defaultParserRegistry.registerLazy({
    formatId: "org",
    load: async () => {
        const { parseOrgDocument } = await import("../features/parsers/org/index.ts");
        return {
            id: "org",
            name: "Org Mode",
            parse: parseOrgDocument,
        };
    },
});

// Lazy registration of Markdown / GFM parser
defaultParserRegistry.registerLazy({
    formatId: "markdown",
    load: async () => {
        const { parseMarkdownDocument } = await import("../features/parsers/markdown/index.ts");
        return {
            id: "markdown",
            name: "Markdown",
            parse: parseMarkdownDocument,
        };
    },
});

// Lazy registration of JSON parser
defaultParserRegistry.registerLazy({
    formatId: "json",
    load: async () => {
        const { parseJsonDocument } = await import("../features/parsers/json/index.ts");
        return {
            id: "json",
            name: "JSON",
            parse: parseJsonDocument,
        };
    },
});
