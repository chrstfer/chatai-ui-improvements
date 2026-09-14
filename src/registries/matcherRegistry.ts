/**
 * Centralized Matcher Registry.
 * Manages eager format matchers for fast, synchronous language detection.
 */

import type { FormatMatcher } from "@internal/contracts/features/matchers";
import { ALL_FORMAT_MATCHERS } from "@internal/features/matchers";

export class MatcherRegistry {
    private matchers = new Map<string, FormatMatcher>();

    constructor(initialMatchers: readonly FormatMatcher[] = ALL_FORMAT_MATCHERS) {
        for (const matcher of initialMatchers) {
            this.register(matcher);
        }
    }

    public register(matcher: FormatMatcher): void {
        this.matchers.set(matcher.id.toLowerCase(), matcher);
    }

    public unregister(id: string): boolean {
        return this.matchers.delete(id.toLowerCase());
    }

    public get(id: string): FormatMatcher | undefined {
        return this.matchers.get(id.toLowerCase());
    }

    public getAll(): FormatMatcher[] {
        return Array.from(this.matchers.values());
    }

    public findMatching(
        hint: string,
        firstLines: readonly string[] = [],
    ): FormatMatcher | undefined {
        const clean = hint.trim().toLowerCase();
        for (const matcher of this.matchers.values()) {
            if (matcher.id === clean || matcher.aliases.includes(clean)) {
                return matcher;
            }
        }
        for (const matcher of this.matchers.values()) {
            if (matcher.matches(hint, firstLines)) {
                return matcher;
            }
        }
        return undefined;
    }

    public formatDisplayName(hint: string): string {
        if (!hint || hint.trim() === "") return "CODE";
        const matched = this.findMatching(hint);
        if (matched) return matched.name.toUpperCase();
        return hint.trim().toUpperCase();
    }

    public clear(): void {
        this.matchers.clear();
    }
}

export const defaultMatcherRegistry = new MatcherRegistry();
