import { assertEquals } from "@std/assert";
import { orgMatcher } from "@internal/features/matchers";

Deno.test("unit: OrgMatcher: matches org language hints case-insensitively", () => {
    // Arrange & Act
    const matchesOrg = orgMatcher.matches("org");
    const matchesUppercase = orgMatcher.matches("ORG-MODE");

    // Assert
    assertEquals(matchesOrg && matchesUppercase, true);
});

Deno.test("unit: OrgMatcher: matches org headline in initial lines", () => {
    // Arrange & Act
    const matches = orgMatcher.matches("", ["* Top Level Heading"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: OrgMatcher: matches title metadata in initial lines", () => {
    // Arrange & Act
    const matches = orgMatcher.matches("", ["#+TITLE: My Document"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: OrgMatcher: rejects non-org programming code", () => {
    // Arrange & Act
    const matches = orgMatcher.matches("", ["def foo(): return 42"]);

    // Assert
    assertEquals(matches, false);
});

Deno.test("unit: OrgMatcher: rejects markdown initial line constructs", () => {
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
