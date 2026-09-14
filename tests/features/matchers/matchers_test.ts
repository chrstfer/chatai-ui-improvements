/**
 * Eager Format Matchers & Resolution Test Suite.
 */

import { assertEquals } from "@std/assert";
import {
    findMatchingFormat,
    formatDisplayName,
    markdownMatcher,
    orgMatcher,
} from "../../../src/features/matchers/index.ts";

Deno.test("unit: FormatMatchers: orgMatcher and markdownMatcher cross-reject each other's hints", () => {
    // Arrange & Act
    const orgRejectsMd = !orgMatcher.matches("markdown") && !orgMatcher.matches("md");
    const mdRejectsOrg = !markdownMatcher.matches("org") && !markdownMatcher.matches("org-mode");

    // Assert
    assertEquals(orgRejectsMd && mdRejectsOrg, true);
});

Deno.test("unit: FormatMatchers: findMatchingFormat resolves canonical format matcher by hint", () => {
    // Arrange & Act
    const match = findMatchingFormat("org");

    // Assert
    assertEquals(match?.id, "org");
});

Deno.test("unit: FormatMatchers: findMatchingFormat returns undefined for unknown format hint", () => {
    // Arrange & Act
    const match = findMatchingFormat("unknown-custom-format-xyz");

    // Assert
    assertEquals(match, undefined);
});

Deno.test("unit: FormatMatchers: formatDisplayName formats known language tags into uppercase display labels", () => {
    // Arrange & Act
    const label = formatDisplayName("org");

    // Assert
    assertEquals(label, "ORG MODE");
});

Deno.test("unit: FormatMatchers: formatDisplayName falls back to CODE for empty language hint", () => {
    // Arrange & Act
    const label = formatDisplayName("");

    // Assert
    assertEquals(label, "CODE");
});
