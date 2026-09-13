/**
 * Eager Format Matcher contract.
 * Lightweight, zero-dependency heuristics for instant (0ms) language identification.
 */

export interface FormatMatcher {
    /** Canonical language/format identifier (e.g. 'org', 'markdown', 'json') */
    readonly id: string;
    /** Human-readable display label (e.g. 'Org Mode', 'Markdown', 'JSON') */
    readonly name: string;
    /** Recognized language tags and aliases (e.g. ['org', 'org-mode']) */
    readonly aliases: readonly string[];

    /**
     * Evaluates whether this format matches an explicit language hint
     * or the initial lines of code block content.
     */
    matches(hint: string, firstLines?: readonly string[]): boolean;
}
