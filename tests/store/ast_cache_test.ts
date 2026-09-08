import { assertEquals, assertFalse, assertNotEquals } from "@std/assert";
import { AstCache, defaultAstCache } from "../../src/store/astCache.ts";

Deno.test("AstCache: Stores and retrieves AST by hash and type", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };

    cache.set(12345, "org", mockAst);

    assertEquals(cache.has(12345, "org"), true);
    assertEquals(cache.has(12345, "ORG"), true); // Case-insensitive type
    assertEquals(cache.get(12345, "org"), mockAst);
    assertEquals(cache.get(12345, "python"), undefined);
    assertEquals(cache.size, 1);

    const entry = cache.getEntry(12345, "org");
    assertEquals(entry?.hash, 12345);
    assertEquals(entry?.type, "org");
    assertEquals(entry?.ast, mockAst);
    assertNotEquals(entry?.timestamp, undefined);
});

Deno.test("AstCache: Deletes entries and supports clear", () => {
    const cache = new AstCache(10);
    cache.set(1, "org", { id: 1 });
    cache.set(2, "org", { id: 2 });

    assertEquals(cache.size, 2);
    assertEquals(cache.delete(1, "org"), true);
    assertEquals(cache.size, 1);
    assertFalse(cache.has(1, "org"));

    cache.clear();
    assertEquals(cache.size, 0);
    assertFalse(cache.has(2, "org"));
});

Deno.test("AstCache: Evicts least recently used entry on capacity overflow", () => {
    const cache = new AstCache(3);

    cache.set(1, "org", { id: 1 });
    cache.set(2, "org", { id: 2 });
    cache.set(3, "org", { id: 3 });

    assertEquals(cache.size, 3);

    // Access entry 1 so it becomes most recently used
    const accessed = cache.get(1, "org");
    assertEquals(accessed, { id: 1 });

    // Insert entry 4 -> capacity reached, oldest unaccessed is entry 2
    cache.set(4, "org", { id: 4 });

    assertEquals(cache.size, 3);
    assertFalse(cache.has(2, "org")); // 2 was evicted
    assertEquals(cache.has(1, "org"), true); // 1 was kept because it was accessed
    assertEquals(cache.has(3, "org"), true);
    assertEquals(cache.has(4, "org"), true);
});

Deno.test("AstCache: defaultAstCache singleton is available with capacity 200", () => {
    assertEquals(defaultAstCache.maxCapacity, 200);
});
