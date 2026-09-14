import { assertEquals } from "@std/assert";
import { jsonMatcher } from "../../../src/features/matchers/json.ts";

Deno.test("unit: JsonMatcher: matches json and jsonc language hints", () => {
    // Arrange & Act
    const matchesJson = jsonMatcher.matches("json");
    const matchesJsonc = jsonMatcher.matches("jsonc");

    // Assert
    assertEquals(matchesJson && matchesJsonc, true);
});

Deno.test("unit: JsonMatcher: matches json object bracket in initial lines", () => {
    // Arrange & Act
    const matches = jsonMatcher.matches("", ["{", '  "key": "value"', "}"]);

    // Assert
    assertEquals(matches, true);
});

Deno.test("unit: JsonMatcher: matches json array bracket in initial lines", () => {
    // Arrange & Act
    const matches = jsonMatcher.matches("", ["[1, 2, 3]"]);

    // Assert
    assertEquals(matches, true);
});
