/**
 * Eager Format Matchers Catalog & Utilities.
 */

import type { FormatMatcher } from "@internal/contracts/features/matchers";
import { orgMatcher } from "./org.ts";
import { markdownMatcher } from "./markdown.ts";
import { jsonMatcher } from "./json.ts";

export { orgMatcher } from "./org.ts";
export { markdownMatcher } from "./markdown.ts";
export { jsonMatcher } from "./json.ts";

export const ALL_FORMAT_MATCHERS: readonly FormatMatcher[] = [
    orgMatcher,
    markdownMatcher,
    jsonMatcher,
];

/**
 * Resolves a matching format from language hint or code block initial lines.
 */
export function findMatchingFormat(
    hint: string,
    firstLines: readonly string[] = [],
): FormatMatcher | undefined {
    const clean = hint.trim().toLowerCase();
    for (const matcher of ALL_FORMAT_MATCHERS) {
        if (matcher.id === clean || matcher.aliases.includes(clean)) {
            return matcher;
        }
    }
    for (const matcher of ALL_FORMAT_MATCHERS) {
        if (matcher.matches(hint, firstLines)) {
            return matcher;
        }
    }
    return undefined;
}

/**
 * Standardizes a language hint into a human-readable display label (e.g. "ORG MODE", "MARKDOWN").
 */
export function formatDisplayName(hint: string): string {
    if (!hint || hint.trim() === "") return "CODE";
    const matched = findMatchingFormat(hint);
    if (matched) return matched.name.toUpperCase();
    return hint.trim().toUpperCase();
}
