/**
 * Matcher Registry Test Suite.
 */

import { assertEquals } from "@std/assert";
import { defaultMatcherRegistry, MatcherRegistry } from "../../src/registries/matcherRegistry.ts";
import type { FormatMatcher } from "../../src/contracts/features/matchers/index.ts";

Deno.test("unit: MatcherRegistry: registers and retrieves format matcher by ID", () => {
    // Arrange
    const registry = new MatcherRegistry([]);
    const testMatcher: FormatMatcher = {
        id: "lua",
        name: "Lua Script",
        aliases: ["lua"],
        matches: (hint) => hint.toLowerCase() === "lua",
    };

    // Act
    registry.register(testMatcher);

    // Assert
    assertEquals(registry.get("lua"), testMatcher);
});

Deno.test("unit: MatcherRegistry: findMatching resolves matcher by hint", () => {
    // Arrange
    const registry = new MatcherRegistry([]);
    const testMatcher: FormatMatcher = {
        id: "lua",
        name: "Lua Script",
        aliases: ["lua"],
        matches: (hint) => hint.toLowerCase() === "lua",
    };
    registry.register(testMatcher);

    // Act
    const matched = registry.findMatching("lua");

    // Assert
    assertEquals(matched, testMatcher);
});

Deno.test("unit: MatcherRegistry: formatDisplayName returns uppercase name for registered matcher", () => {
    // Arrange
    const registry = new MatcherRegistry([]);
    const testMatcher: FormatMatcher = {
        id: "lua",
        name: "Lua Script",
        aliases: ["lua"],
        matches: (hint) => hint.toLowerCase() === "lua",
    };
    registry.register(testMatcher);

    // Act
    const displayName = registry.formatDisplayName("lua");

    // Assert
    assertEquals(displayName, "LUA SCRIPT");
});

Deno.test("unit: MatcherRegistry: formatDisplayName falls back to uppercase hint for unregistered format", () => {
    // Arrange
    const registry = new MatcherRegistry([]);

    // Act
    const displayName = registry.formatDisplayName("unknown-format");

    // Assert
    assertEquals(displayName, "UNKNOWN-FORMAT");
});

Deno.test("unit: MatcherRegistry: unregister removes format matcher", () => {
    // Arrange
    const registry = new MatcherRegistry([]);
    const testMatcher: FormatMatcher = {
        id: "lua",
        name: "Lua Script",
        aliases: ["lua"],
        matches: (hint) => hint.toLowerCase() === "lua",
    };
    registry.register(testMatcher);

    // Act
    registry.unregister("lua");

    // Assert
    assertEquals(registry.get("lua"), undefined);
});

Deno.test("unit: MatcherRegistry: defaultMatcherRegistry contains core format matchers", () => {
    // Arrange & Act
    const hasOrg = defaultMatcherRegistry.get("org") !== undefined;
    const hasMd = defaultMatcherRegistry.get("markdown") !== undefined;
    const hasJson = defaultMatcherRegistry.get("json") !== undefined;

    // Assert
    assertEquals(hasOrg && hasMd && hasJson, true);
});
