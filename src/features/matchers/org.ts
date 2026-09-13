/**
 * Eager Format Matcher for Emacs Org-Mode.
 */

import type { FormatMatcher } from "../../contracts/features/matchers/index.ts";

export const orgMatcher: FormatMatcher = {
    id: "org",
    name: "Org Mode",
    aliases: ["org", "orgmode", "org-mode"],
    matches(hint: string, firstLines: readonly string[] = []): boolean {
        const clean = hint.trim().toLowerCase();
        if (this.aliases.includes(clean)) return true;
        return firstLines.some((l) => /^\*{1,6}\s+|^#\+(?:title|author|date|begin_)/i.test(l.trim()));
    },
};
