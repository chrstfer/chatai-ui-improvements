import { assertEquals, assertNotEquals } from "@std/assert";
import { computeContentHash, formatHashHex } from "@internal/core/utils";
import { defaultViewStateCache, ViewStateCache } from "@internal/store";

Deno.test("unit: ContentHash: produces identical uint32 hashes for identical inputs", () => {
    // Arrange
    const text = "* Heading\nSome content in an org block";

    // Act
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text);

    // Assert
    assertEquals(hash1, hash2);
});

Deno.test("unit: ContentHash: produces different hashes for distinct content", () => {
    // Arrange
    const text = "* Heading\nSome content in an org block";

    // Act
    const hash1 = computeContentHash(text);
    const hash2 = computeContentHash(text + " modification");

    // Assert
    assertNotEquals(hash1, hash2);
});

Deno.test("unit: ContentHash: returns FNV-1a offset basis for empty string", () => {
    // Arrange & Act
    const emptyHash = computeContentHash("");

    // Assert
    assertEquals(emptyHash, 2166136261);
});

Deno.test("unit: ContentHash: incorporates format salt into hash generation", () => {
    // Arrange
    const text = "* Heading";

    // Act
    const orgHash = computeContentHash(text, "org");
    const pythonHash = computeContentHash(text, "python");

    // Assert
    assertNotEquals(orgHash, pythonHash);
});

Deno.test("unit: ContentHash: formats zero as eight zero-padded hex characters", () => {
    // Arrange & Act
    const formatted = formatHashHex(0);

    // Assert
    assertEquals(formatted, "00000000");
});

Deno.test("unit: ContentHash: formats 32-bit unsigned integers as lowercase hex", () => {
    // Arrange & Act
    const formatted = formatHashHex(0x811c9dc5);

    // Assert
    assertEquals(formatted, "811c9dc5");
});

Deno.test("unit: ContentHash: formats maximum uint32 as ffffffff", () => {
    // Arrange & Act
    const formatted = formatHashHex(0xffffffff);

    // Assert
    assertEquals(formatted, "ffffffff");
});

Deno.test("unit: ViewStateCache: returns undefined for un-cached keys", () => {
    // Arrange
    const cache = new ViewStateCache(3);

    // Act
    const value = cache.get(999);

    // Assert
    assertEquals(value, undefined);
});

Deno.test("unit: ViewStateCache: stores and retrieves state by numeric key", () => {
    // Arrange
    const cache = new ViewStateCache(3);

    // Act
    cache.set(101, { isFolded: true, viewMode: "rendered" });

    // Assert
    assertEquals(cache.get(101), { isFolded: true, viewMode: "rendered" });
});

Deno.test("unit: ViewStateCache: updates existing key without incrementing size", () => {
    // Arrange
    const cache = new ViewStateCache(3);
    cache.set(101, { isFolded: true, viewMode: "rendered" });

    // Act
    cache.set(101, { isFolded: false, viewMode: "raw" });

    // Assert
    assertEquals(cache.size, 1);
});

Deno.test("unit: ViewStateCache: supports retrieval using string keys", () => {
    // Arrange
    const cache = new ViewStateCache(3);

    // Act
    cache.set("custom-key", { isFolded: true, viewMode: "raw" });

    // Assert
    assertEquals(cache.get("custom-key"), { isFolded: true, viewMode: "raw" });
});

Deno.test("unit: ViewStateCache: evicts least recently used entry on capacity overflow", () => {
    // Arrange
    const cache = new ViewStateCache(3);
    cache.set(1, { isFolded: false, viewMode: "rendered" });
    cache.set(2, { isFolded: true, viewMode: "raw" });
    cache.set(3, { isFolded: false, viewMode: "raw" });

    // Act: inserting fourth entry evicts key 1 (oldest unaccessed)
    cache.set(4, { isFolded: true, viewMode: "rendered" });

    // Assert
    assertEquals(cache.has(1), false);
});

Deno.test("unit: ViewStateCache: read access promotes entry to most recently used", () => {
    // Arrange
    const cache = new ViewStateCache(3);
    cache.set(1, { isFolded: false, viewMode: "rendered" });
    cache.set(2, { isFolded: true, viewMode: "raw" });
    cache.set(3, { isFolded: false, viewMode: "raw" });

    // Act: access key 1 to make key 2 the LRU entry, then insert key 4
    cache.get(1);
    cache.set(4, { isFolded: true, viewMode: "rendered" });

    // Assert: key 2 was evicted while key 1 remains
    assertEquals(cache.has(2), false);
});

Deno.test("unit: ViewStateCache: clear purges all entries and resets size", () => {
    // Arrange
    const cache = new ViewStateCache(3);
    cache.set(1, { isFolded: false, viewMode: "rendered" });
    cache.set(2, { isFolded: true, viewMode: "raw" });

    // Act
    cache.clear();

    // Assert
    assertEquals(cache.size, 0);
});

Deno.test("unit: ViewStateCache: defaultViewStateCache is exported as a singleton instance", () => {
    // Assert
    assertEquals(defaultViewStateCache instanceof ViewStateCache, true);
});
