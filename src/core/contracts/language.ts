import type { DocumentViewComponent } from "./documentView.ts";

/**
 * Pluggable language module definition.
 */
export interface LanguageDefinition {
    /** Unique language identifier (e.g. 'org', 'latex', 'json') */
    readonly id: string;
    /** Human-readable display label (e.g. 'Org Mode') */
    readonly name: string;
    /** Recognized language tags and aliases (e.g. ['org', 'org-mode']) */
    readonly aliases: readonly string[];

    /**
     * Multi-signal detector evaluating whether this module handles the content.
     * Tests explicit host language hints and applies fallback regex heuristics
     * to the first lines of raw content (e.g. ^\*+\s or ^#\+TITLE:).
     */
    matches(languageHint: string, firstLines: readonly string[]): boolean;

    /**
     * Asynchronous loader resolving the view component chunk on demand.
     * Enables tree-shaking and dynamic ESM loading via web_accessible_resources.
     */
    loadView(): Promise<DocumentViewComponent>;

    /**
     * Optional headless parser producing an Abstract Syntax Tree (AST) for this language.
     */
    parse?(rawText: string): unknown;
}
