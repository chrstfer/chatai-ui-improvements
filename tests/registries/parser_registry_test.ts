/**
 * Parser Registry Test Suite.
 */

import { assertEquals } from "@std/assert";
import { defaultParserRegistry, ParserRegistry } from "../../src/registries/parserRegistry.ts";
import type { Parser } from "../../src/contracts/features/parsers/index.ts";
import { AstCache } from "../../src/store/astCache.ts";

Deno.test("unit: ParserRegistry: has returns false for unregistered format", () => {
    // Arrange
    const registry = new ParserRegistry();

    // Act & Assert
    assertEquals(registry.has("unregistered"), false);
});

Deno.test("unit: ParserRegistry: registerLazy registers format parser definition", () => {
    // Arrange
    const registry = new ParserRegistry();

    // Act
    registry.registerLazy({
        formatId: "custom",
        load: () =>
            Promise.resolve({
                id: "custom",
                name: "Custom Parser",
                parse: (raw) => ({ type: "custom-ast", text: raw }),
            }),
    });

    // Assert
    assertEquals(registry.has("custom"), true);
});

Deno.test("unit: ParserRegistry: get dynamically loads registered parser", async () => {
    // Arrange
    const registry = new ParserRegistry();
    const mockParser: Parser = {
        id: "custom",
        name: "Custom Parser",
        parse: (raw) => ({ type: "custom-ast", text: raw }),
    };
    registry.registerLazy({
        formatId: "custom",
        load: () => Promise.resolve(mockParser),
    });

    // Act
    const loadedParser = await registry.get("custom");

    // Assert
    assertEquals(loadedParser, mockParser);
});

Deno.test("integration: ParserRegistry: settleContent parses content and caches AST in AstCache", async () => {
    // Arrange
    const registry = new ParserRegistry();
    let parseCount = 0;
    registry.registerLazy({
        formatId: "custom",
        load: () =>
            Promise.resolve({
                id: "custom",
                name: "Custom Parser",
                parse: (raw) => {
                    parseCount++;
                    return { type: "custom-ast", text: raw };
                },
            }),
    });
    const astCache = new AstCache(10);

    // Act
    await registry.settleContent("custom-syntax-block", "custom", astCache);

    // Assert
    assertEquals(parseCount, 1);
});

Deno.test("integration: ParserRegistry: settleContent reuses cached AST on identical content", async () => {
    // Arrange
    const registry = new ParserRegistry();
    let parseCount = 0;
    registry.registerLazy({
        formatId: "custom",
        load: () =>
            Promise.resolve({
                id: "custom",
                name: "Custom Parser",
                parse: (raw) => {
                    parseCount++;
                    return { type: "custom-ast", text: raw };
                },
            }),
    });
    const astCache = new AstCache(10);
    const content = "custom-syntax-block";
    await registry.settleContent(content, "custom", astCache);

    // Act: settle same content again
    await registry.settleContent(content, "custom", astCache);

    // Assert: parser was not invoked a second time
    assertEquals(parseCount, 1);
});

Deno.test("unit: ParserRegistry: defaultParserRegistry defines lazy Org parser with org formatId", async () => {
    // Arrange & Act
    const orgParser = await defaultParserRegistry.get("org");

    // Assert
    assertEquals(orgParser?.id, "org");
});
