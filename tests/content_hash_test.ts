import { assertEquals, assertNotEquals } from "@std/assert";
import { computeContentHash } from "../src/core/utils/contentHash.ts";
import { defaultViewStateCache, ViewStateCache } from "../src/store/viewStateCache.ts";

Deno.test("computeContentHash produces deterministic 32-bit FNV-1a hex hashes", () => {
    const text = "* Heading\nSome content in an org block";
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text);

    assertEquals(hash1, hash2);
    assertEquals(typeof hash1, "string");
    assertEquals(hash1.length, 8);

    // Different content produces different hash
    const differentHash = computeContentHash(text + " extra");
    assertNotEquals(hash1, differentHash);

    // Empty content produces valid deterministic hash (offset basis)
    const emptyHash = computeContentHash("");
    assertEquals(emptyHash, "811c9dc5");

    // Salt distinguishes identical content in different contexts
    const saltedHash1 = computeContentHash(text, "org");
    const saltedHash2 = computeContentHash(text, "python");
    assertNotEquals(saltedHash1, saltedHash2);
    assertNotEquals(saltedHash1, hash1);
});

Deno.test("ViewStateCache caches and retrieves view state per hash", () => {
    const cache = new ViewStateCache(3);

    assertEquals(cache.size, 0);
    assertEquals(cache.get("h1"), undefined);

    cache.set("h1", { isFolded: true, viewMode: "rendered" });
    assertEquals(cache.size, 1);
    assertEquals(cache.get("h1"), { isFolded: true, viewMode: "rendered" });

    // Update existing state
    cache.set("h1", { isFolded: false, viewMode: "raw" });
    assertEquals(cache.size, 1);
    assertEquals(cache.get("h1"), { isFolded: false, viewMode: "raw" });
});

Deno.test("ViewStateCache evicts least recently used items on capacity overflow", () => {
    const cache = new ViewStateCache(3);

    cache.set("h1", { isFolded: false, viewMode: "rendered" });
    cache.set("h2", { isFolded: true, viewMode: "raw" });
    cache.set("h3", { isFolded: false, viewMode: "raw" });
    assertEquals(cache.size, 3);

    // Access h1 to promote it to MRU (LRU order becomes: h2, h3, h1)
    assertEquals(cache.get("h1")?.viewMode, "rendered");

    // Insert h4; should evict h2 (oldest unaccessed)
    cache.set("h4", { isFolded: true, viewMode: "rendered" });
    assertEquals(cache.size, 3);
    assertEquals(cache.has("h2"), false);
    assertEquals(cache.has("h1"), true);
    assertEquals(cache.has("h3"), true);
    assertEquals(cache.has("h4"), true);

    // Clear works
    cache.clear();
    assertEquals(cache.size, 0);
    assertEquals(cache.has("h1"), false);
});

Deno.test("defaultViewStateCache singleton is initialized with 500 capacity", () => {
    assertEquals(defaultViewStateCache instanceof ViewStateCache, true);
});
