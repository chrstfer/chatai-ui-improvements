import { assertEquals } from "@std/assert";
import { markdownMatcher } from "../../../src/features/matchers/markdown.ts";

Deno.test("unit: MarkdownMatcher: matches md and gfm language hints", () => {
    // Arrange & Act
    const matchesMd = markdownMatcher.matches("md");
    const matchesGfm = markdownMatcher.matches("gfm");

    // Assert
    assertEquals(matchesMd && matchesGfm, true);
});

Deno.test("unit: MarkdownMatcher: matches atx heading in initial lines", () => {
    // Arrange & Act
    const matches = markdownMatcher.matches("", ["# Top Level ATX"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: MarkdownMatcher: matches github alerts in initial lines", () => {
    // Arrange & Act
    const matches = markdownMatcher.matches("", ["> [!NOTE]", "> Alert text"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: MarkdownMatcher: rejects org initial line constructs", () => {
    // Arrange
    const orgSamples: string[][] = [
        ["* Top Level Org Heading", "Some paragraph text"],
        ["** Subheading Org Level 2", "More content"],
        ["#+TITLE: Canonical Org Mode Document"],
        ["#+BEGIN_SRC python", "print('hello')", "#+END_SRC"],
    ];

    // Act
    const anyMatched = orgSamples.some((sample) => markdownMatcher.matches("", sample));

    // Assert
    assertEquals(anyMatched, false);
});
