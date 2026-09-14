/**
 * Eager Format Matcher for JSON.
 */

import type { FormatMatcher } from "@internal/contracts/features/matchers";

export const jsonMatcher: FormatMatcher = {
    id: "json",
    name: "JSON",
    aliases: ["json", "jsonc", "json5"],
    matches(hint: string, firstLines: readonly string[] = []): boolean {
        const clean = hint.trim().toLowerCase();
        if (this.aliases.includes(clean)) return true;
        const joined = firstLines.join("").trim();
        return joined.startsWith("{") || joined.startsWith("[");
    },
};
