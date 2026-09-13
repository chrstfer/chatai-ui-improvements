/**
 * Parser Registry Test Suite.
 */

import { assertEquals, assertExists } from "@std/assert";
import { defaultParserRegistry, ParserRegistry } from "../../src/registries/parserRegistry.ts";
import type { Parser } from "../../src/contracts/features/parsers/index.ts";
import { AstCache } from "../../src/store/astCache.ts";

Deno.test("ParserRegistry: Registers lazy parsers and settles AST in AstCache", async () => {
    const registry = new ParserRegistry();
    let parseCount = 0;
    const mockParser: Parser = {
        id: "custom",
        name: "Custom Parser",
        parse: (raw) => {
            parseCount++;
            return { type: "custom-ast", text: raw };
        },
    };

    assertEquals(registry.has("custom"), false);
    registry.registerLazy({
        formatId: "custom",
        load: async () => mockParser,
    });
    assertEquals(registry.has("custom"), true);

    const loadedParser = await registry.get("custom");
    assertEquals(loadedParser, mockParser);

    // Settle content and verify AST caching
    const astCache = new AstCache(10);
    const content = "custom-syntax-block";
    const res1 = await registry.settleContent(content, "custom", astCache);
    assertExists(res1.ast);
    assertEquals(parseCount, 1);

    // Second settlement uses cached AST without re-parsing
    const res2 = await registry.settleContent(content, "custom", astCache);
    assertEquals(res2.ast, res1.ast);
    assertEquals(parseCount, 1);
});

Deno.test("ParserRegistry: defaultParserRegistry contains lazy Org parser", async () => {
    assertEquals(defaultParserRegistry.has("org"), true);
    const orgParser = await defaultParserRegistry.get("org");
    assertExists(orgParser);
    assertEquals(orgParser.id, "org");
});
