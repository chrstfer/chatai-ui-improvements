import { assertEquals, assertFalse, assertNotEquals } from "@std/assert";
import { AstCache, defaultAstCache } from "@internal/store";

Deno.test("unit: AstCache: stores and verifies entry existence", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };
    cache.set(12345, "org", mockAst);
    assertEquals(cache.has(12345, "org"), true);
});

Deno.test("unit: AstCache: has normalizes format type case-insensitively", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };
    cache.set(12345, "org", mockAst);
    assertEquals(cache.has(12345, "ORG"), true);
});

Deno.test("unit: AstCache: get retrieves stored AST", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };
    cache.set(12345, "org", mockAst);
    assertEquals(cache.get(12345, "org"), mockAst);
});

Deno.test("unit: AstCache: get returns undefined for mismatched type", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };
    cache.set(12345, "org", mockAst);
    assertEquals(cache.get(12345, "python"), undefined);
});

Deno.test("unit: AstCache: size reports correct element count", () => {
    const cache = new AstCache(10);
    cache.set(12345, "org", { type: "document" });
    assertEquals(cache.size, 1);
});

Deno.test("unit: AstCache: getEntry populates metadata hash", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };
    cache.set(12345, "org", mockAst);
    const entry = cache.getEntry(12345, "org");
    assertEquals(entry?.hash, 12345);
});

Deno.test("unit: AstCache: getEntry populates metadata timestamp", () => {
    const cache = new AstCache(10);
    const mockAst = { type: "document", children: [] };
    cache.set(12345, "org", mockAst);
    const entry = cache.getEntry(12345, "org");
    assertNotEquals(entry?.timestamp, undefined);
});

Deno.test("unit: AstCache: delete removes specified entry", () => {
    const cache = new AstCache(10);
    cache.set(1, "org", { id: 1 });
    cache.delete(1, "org");
    assertFalse(cache.has(1, "org"));
});

Deno.test("unit: AstCache: delete decreases cache size", () => {
    const cache = new AstCache(10);
    cache.set(1, "org", { id: 1 });
    cache.set(2, "org", { id: 2 });
    cache.delete(1, "org");
    assertEquals(cache.size, 1);
});

Deno.test("unit: AstCache: clear resets size to zero", () => {
    const cache = new AstCache(10);
    cache.set(1, "org", { id: 1 });
    cache.clear();
    assertEquals(cache.size, 0);
});

Deno.test("unit: AstCache: clear purges stored entries", () => {
    const cache = new AstCache(10);
    cache.set(2, "org", { id: 2 });
    cache.clear();
    assertFalse(cache.has(2, "org"));
});

Deno.test("unit: AstCache: evicts least recently used entry on capacity overflow", () => {
    const cache = new AstCache(3);
    cache.set(1, "org", { id: 1 });
    cache.set(2, "org", { id: 2 });
    cache.set(3, "org", { id: 3 });
    cache.get(1, "org"); // 1 is accessed, 2 is oldest unaccessed
    cache.set(4, "org", { id: 4 });
    assertFalse(cache.has(2, "org"));
});

Deno.test("unit: AstCache: preserves recently accessed entry during LRU eviction", () => {
    const cache = new AstCache(3);
    cache.set(1, "org", { id: 1 });
    cache.set(2, "org", { id: 2 });
    cache.set(3, "org", { id: 3 });
    cache.get(1, "org"); // 1 is accessed
    cache.set(4, "org", { id: 4 });
    assertEquals(cache.has(1, "org"), true);
});

Deno.test("unit: AstCache: defaultAstCache singleton is configured with capacity 200", () => {
    assertEquals(defaultAstCache.maxCapacity, 200);
});
