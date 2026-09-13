/**
 * Eager Format Matchers & Mutual Distinctness Test Suite.
 */

import { assertEquals, assertExists } from "@std/assert";
import {
    ALL_FORMAT_MATCHERS,
    findMatchingFormat,
    formatDisplayName,
    jsonMatcher,
    markdownMatcher,
    orgMatcher,
} from "../../../src/features/matchers/index.ts";

Deno.test("FormatMatcher: orgMatcher identifies Org Mode hints and initial lines", () => {
    assertEquals(orgMatcher.id, "org");
    assertEquals(orgMatcher.matches("org"), true);
    assertEquals(orgMatcher.matches("ORG-MODE"), true);
    assertEquals(orgMatcher.matches("markdown"), false);

    // Initial lines heuristic
    assertEquals(orgMatcher.matches("", ["* Top Level Heading"]), true);
    assertEquals(orgMatcher.matches("", ["#+TITLE: My Document"]), true);
    assertEquals(orgMatcher.matches("", ["def foo(): return 42"]), false);
});

Deno.test("FormatMatcher: markdownMatcher identifies Markdown hints and initial lines", () => {
    assertEquals(markdownMatcher.id, "markdown");
    assertEquals(markdownMatcher.matches("md"), true);
    assertEquals(markdownMatcher.matches("gfm"), true);
    assertEquals(markdownMatcher.matches("python"), false);

    // Initial lines heuristic
    assertEquals(markdownMatcher.matches("", ["# Top Level ATX"]), true);
    assertEquals(markdownMatcher.matches("", ["> [!NOTE]", "> Alert text"]), true);
});

Deno.test("FormatMatcher: jsonMatcher identifies JSON hints and initial lines", () => {
    assertEquals(jsonMatcher.id, "json");
    assertEquals(jsonMatcher.matches("json"), true);
    assertEquals(jsonMatcher.matches("jsonc"), true);
    assertEquals(jsonMatcher.matches("org"), false);

    // Initial lines heuristic
    assertEquals(jsonMatcher.matches("", ["{", '  "key": "value"', "}"]), true);
    assertEquals(jsonMatcher.matches("", ["[1, 2, 3]"]), true);
});

Deno.test("FormatMatcher: orgMatcher and markdownMatcher are strictly mutually distinct", () => {
    // 1. Cross-hint distinction: orgMatcher must reject Markdown aliases
    assertEquals(orgMatcher.matches("markdown"), false);
    assertEquals(orgMatcher.matches("md"), false);
    assertEquals(orgMatcher.matches("gfm"), false);
    assertEquals(orgMatcher.matches("commonmark"), false);

    // 2. Cross-hint distinction: markdownMatcher must reject Org aliases
    assertEquals(markdownMatcher.matches("org"), false);
    assertEquals(markdownMatcher.matches("orgmode"), false);
    assertEquals(markdownMatcher.matches("org-mode"), false);

    // 3. Org matcher rejects Markdown content constructs
    const markdownSamples: string[][] = [
        ["# Top Level ATX Heading", "Some paragraph text"],
        ["## Subheading ATX", "More content"],
        ["> [!NOTE]", "> GitHub styled alert note"],
        ["> [!WARNING]", "> Important warning box"],
        ["```typescript", "const x = 42;", "```"],
    ];
    for (const sample of markdownSamples) {
        assertEquals(
            orgMatcher.matches("", sample),
            false,
            `orgMatcher should not match markdown content: ${sample[0]}`,
        );
    }

    // 4. Markdown matcher rejects Org Mode content constructs
    const orgSamples: string[][] = [
        ["* Top Level Org Heading", "Some paragraph text"],
        ["** Subheading Org Level 2", "More content"],
        ["#+TITLE: Canonical Org Mode Document"],
        ["#+AUTHOR: DeepMind Pair"],
        ["#+DATE: 2026-09-13"],
        ["#+BEGIN_SRC python", "print('hello')", "#+END_SRC"],
    ];
    for (const sample of orgSamples) {
        assertEquals(
            markdownMatcher.matches("", sample),
            false,
            `markdownMatcher should not match org content: ${sample[0]}`,
        );
    }
});

Deno.test("FormatMatcher: Utilities findMatchingFormat and formatDisplayName work accurately", () => {
    assertEquals(findMatchingFormat("org")?.id, "org");
    assertEquals(findMatchingFormat("md")?.id, "markdown");
    assertEquals(findMatchingFormat("json")?.id, "json");
    assertEquals(findMatchingFormat("unknown-lang"), undefined);

    assertEquals(formatDisplayName("org"), "ORG MODE");
    assertEquals(formatDisplayName("md"), "MARKDOWN");
    assertEquals(formatDisplayName("json"), "JSON");
    assertEquals(formatDisplayName("python"), "PYTHON");
    assertEquals(formatDisplayName(""), "CODE");
});
