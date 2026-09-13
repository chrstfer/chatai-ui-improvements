/**
 * Eager Format Matcher for Markdown / CommonMark / GFM.
 */

import type { FormatMatcher } from "../../contracts/features/matchers/index.ts";

export const markdownMatcher: FormatMatcher = {
    id: "markdown",
    name: "Markdown",
    aliases: ["markdown", "md", "gfm", "commonmark"],
    matches(hint: string, firstLines: readonly string[] = []): boolean {
        const clean = hint.trim().toLowerCase();
        if (this.aliases.includes(clean)) return true;
        return firstLines.some((l) => /^#{1,6}\s+|^>\s+\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(l.trim()));
    },
};
