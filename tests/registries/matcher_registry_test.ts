/**
 * Matcher Registry Test Suite.
 */

import { assertEquals, assertExists } from "@std/assert";
import { defaultMatcherRegistry, MatcherRegistry } from "../../src/registries/matcherRegistry.ts";
import type { FormatMatcher } from "../../src/contracts/features/matchers/index.ts";

Deno.test("MatcherRegistry: Registers format matchers and resolves display names", () => {
    const registry = new MatcherRegistry([]);
    const testMatcher: FormatMatcher = {
        id: "lua",
        name: "Lua Script",
        aliases: ["lua"],
        matches: (hint) => hint.toLowerCase() === "lua",
    };

    registry.register(testMatcher);
    assertEquals(registry.get("lua"), testMatcher);
    assertEquals(registry.findMatching("lua"), testMatcher);
    assertEquals(registry.formatDisplayName("lua"), "LUA SCRIPT");
    assertEquals(registry.formatDisplayName("unknown"), "UNKNOWN");

    assertEquals(registry.unregister("lua"), true);
    assertEquals(registry.get("lua"), undefined);
});

Deno.test("MatcherRegistry: defaultMatcherRegistry contains core format matchers", () => {
    assertExists(defaultMatcherRegistry.get("org"));
    assertExists(defaultMatcherRegistry.get("markdown"));
    assertExists(defaultMatcherRegistry.get("json"));
});
