/**
 * Eager Format Matchers & Mutual Distinctness Test Suite.
 */

import { assertEquals } from "@std/assert";
import {
    findMatchingFormat,
    formatDisplayName,
    jsonMatcher,
    markdownMatcher,
    orgMatcher,
} from "../../../src/features/matchers/index.ts";

Deno.test("unit: orgMatcher matches org language hints case-insensitively", () => {
    // Arrange & Act
    const matchesOrg = orgMatcher.matches("org");
    const matchesUppercase = orgMatcher.matches("ORG-MODE");

    // Assert
    assertEquals(matchesOrg && matchesUppercase, true);
});

Deno.test("unit: orgMatcher matches org headline in initial lines", () => {
    // Arrange & Act
    const matches = orgMatcher.matches("", ["* Top Level Heading"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: orgMatcher matches title metadata in initial lines", () => {
    // Arrange & Act
    const matches = orgMatcher.matches("", ["#+TITLE: My Document"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: orgMatcher rejects non-org programming code", () => {
    // Arrange & Act
    const matches = orgMatcher.matches("", ["def foo(): return 42"]);

    // Assert
    assertEquals(matches, false);
});

Deno.test("unit: markdownMatcher matches md and gfm language hints", () => {
    // Arrange & Act
    const matchesMd = markdownMatcher.matches("md");
    const matchesGfm = markdownMatcher.matches("gfm");

    // Assert
    assertEquals(matchesMd && matchesGfm, true);
});

Deno.test("unit: markdownMatcher matches atx heading in initial lines", () => {
    // Arrange & Act
    const matches = markdownMatcher.matches("", ["# Top Level ATX"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: markdownMatcher matches github alerts in initial lines", () => {
    // Arrange & Act
    const matches = markdownMatcher.matches("", ["> [!NOTE]", "> Alert text"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: jsonMatcher matches json and jsonc language hints", () => {
    // Arrange & Act
    const matchesJson = jsonMatcher.matches("json");
    const matchesJsonc = jsonMatcher.matches("jsonc");

    // Assert
    assertEquals(matchesJson && matchesJsonc, true);
});

Deno.test("unit: jsonMatcher matches json object bracket in initial lines", () => {
    // Arrange & Act
    const matches = jsonMatcher.matches("", ["{", '  "key": "value"', "}"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: jsonMatcher matches json array bracket in initial lines", () => {
    // Arrange & Act
    const matches = jsonMatcher.matches("", ["[1, 2, 3]"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: orgMatcher and markdownMatcher cross-reject each other's hints", () => {
    // Arrange & Act
    const orgRejectsMd = !orgMatcher.matches("markdown") && !orgMatcher.matches("md");
    const mdRejectsOrg = !markdownMatcher.matches("org") && !markdownMatcher.matches("org-mode");

    // Assert
    assertEquals(orgRejectsMd && mdRejectsOrg, true);
});

Deno.test("unit: orgMatcher rejects markdown initial line constructs", () => {
    // Arrange
    const markdownSamples: string[][] = [
        ["# Top Level ATX Heading", "Some paragraph text"],
        ["## Subheading ATX", "More content"],
        ["> [!NOTE]", "> GitHub styled alert note"],
        ["```typescript", "const x = 42;", "```"],
    ];

    // Act
    const anyMatched = markdownSamples.some((sample) => orgMatcher.matches("", sample));

    // Assert
    assertEquals(anyMatched, false);
});

Deno.test("unit: markdownMatcher rejects org initial line constructs", () => {
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

Deno.test("unit: findMatchingFormat resolves canonical format matcher by hint", () => {
    // Arrange & Act
    const match = findMatchingFormat("org");

    // Assert
    assertEquals(match?.id, "org");
});

Deno.test("unit: findMatchingFormat returns undefined for unknown format hint", () => {
    // Arrange & Act
    const match = findMatchingFormat("unknown-custom-format-xyz");

    // Assert
    assertEquals(match, undefined);
});

Deno.test("unit: formatDisplayName formats known language tags into uppercase display labels", () => {
    // Arrange & Act
    const label = formatDisplayName("org");

    // Assert
    assertEquals(label, "ORG MODE");
});

Deno.test("unit: formatDisplayName falls back to CODE for empty language hint", () => {
    // Arrange & Act
    const label = formatDisplayName("");

    // Assert
    assertEquals(label, "CODE");
});
