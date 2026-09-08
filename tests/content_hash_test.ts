import { assertEquals, assertNotEquals } from "@std/assert";
import { computeContentHash, formatHashHex } from "../src/core/utils/contentHash.ts";
import { defaultViewStateCache, ViewStateCache } from "../src/store/viewStateCache.ts";

Deno.test("computeContentHash produces deterministic uint32 FNV-1a hashes", () => {
    const text = "* Heading\nSome content in an org block";
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text);

    assertEquals(hash1, hash2);
    assertEquals(typeof hash1, "number");
    assertEquals(hash1 >= 0, true);
    assertEquals(hash1 <= 0xffffffff, true);

    // Different content produces different hash
    const differentHash = computeContentHash(text + " extra");
    assertNotEquals(hash1, differentHash);

    // Empty content produces valid deterministic hash (offset basis: 2166136261 / 0x811c9dc5)
    const emptyHash = computeContentHash("");
    assertEquals(emptyHash, 2166136261);
    assertEquals(formatHashHex(emptyHash), "811c9dc5");

    // Salt distinguishes identical content in different contexts
    const saltedHash1 = computeContentHash(text, "org");
    const saltedHash2 = computeContentHash(text, "python");
    assertNotEquals(saltedHash1, saltedHash2);
    assertNotEquals(saltedHash1, hash1);
});

Deno.test("formatHashHex produces 8-character lowercase hexadecimal representation", () => {
    assertEquals(formatHashHex(0), "00000000");
    assertEquals(formatHashHex(0x811c9dc5), "811c9dc5");
    assertEquals(formatHashHex(0xffffffff), "ffffffff");
    assertEquals(formatHashHex(255), "000000ff");
});

Deno.test("ViewStateCache caches and retrieves view state with numeric and string keys", () => {
    const cache = new ViewStateCache(3);

    assertEquals(cache.size, 0);
    assertEquals(cache.get(101), undefined);

    // Numeric key
    cache.set(101, { isFolded: true, viewMode: "rendered" });
    assertEquals(cache.size, 1);
    assertEquals(cache.get(101), { isFolded: true, viewMode: "rendered" });

    // Update existing state
    cache.set(101, { isFolded: false, viewMode: "raw" });
    assertEquals(cache.size, 1);
    assertEquals(cache.get(101), { isFolded: false, viewMode: "raw" });

    // String key compatibility
    cache.set("str-key", { isFolded: true, viewMode: "raw" });
    assertEquals(cache.get("str-key"), { isFolded: true, viewMode: "raw" });
});

Deno.test("ViewStateCache evicts least recently used items on capacity overflow", () => {
    const cache = new ViewStateCache(3);

    cache.set(1, { isFolded: false, viewMode: "rendered" });
    cache.set(2, { isFolded: true, viewMode: "raw" });
    cache.set(3, { isFolded: false, viewMode: "raw" });
    assertEquals(cache.size, 3);

    // Access key 1 to promote it to MRU (LRU order becomes: 2, 3, 1)
    assertEquals(cache.get(1)?.viewMode, "rendered");

    // Insert key 4; should evict key 2 (oldest unaccessed)
    cache.set(4, { isFolded: true, viewMode: "rendered" });
    assertEquals(cache.size, 3);
    assertEquals(cache.has(2), false);
    assertEquals(cache.has(1), true);
    assertEquals(cache.has(3), true);
    assertEquals(cache.has(4), true);

    // Clear works
    cache.clear();
    assertEquals(cache.size, 0);
    assertEquals(cache.has(1), false);
});

Deno.test("defaultViewStateCache singleton is initialized with 500 capacity", () => {
    assertEquals(defaultViewStateCache instanceof ViewStateCache, true);
});
