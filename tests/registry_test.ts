import { assertEquals, assertNotEquals } from "@std/assert";
import { ChatAdapterRegistry, defaultChatRegistry } from "../src/chat/registry.ts";
import type { SiteAdapter } from "../src/core/contracts/index.ts";

function createMockAdapter(id: string, hostname: string): SiteAdapter {
    return {
        id,
        name: `Mock ${id}`,
        themeAuthority: {
            supportsTheming: false,
            getTheme: () => "light",
            onThemeChange: () => () => {},
        },
        matches: (url: URL) => url.hostname === hostname,
        initialize: () => {},
        destroy: () => {},
    };
}

Deno.test("ChatAdapterRegistry: Registers, retrieves, and unregisters adapters", () => {
    const registry = new ChatAdapterRegistry();
    const mock = createMockAdapter("test-chat", "chat.test.com");

    registry.register(mock);
    assertEquals(registry.get("test-chat"), mock);
    assertEquals(registry.getAll().length, 1);

    const removed = registry.unregister("test-chat");
    assertEquals(removed, true);
    assertEquals(registry.get("test-chat"), undefined);
});

Deno.test("ChatAdapterRegistry: Resolves matching eager adapter by URL and string", () => {
    const registry = new ChatAdapterRegistry();
    const mockA = createMockAdapter("gemini-test", "gemini.google.com");
    const mockB = createMockAdapter("duck-test", "duck.ai");

    registry.register(mockA);
    registry.register(mockB);

    assertEquals(registry.findMatching("https://gemini.google.com/app"), mockA);
    assertEquals(registry.findMatching(new URL("https://duck.ai/")), mockB);
    assertEquals(registry.findMatching("https://example.com/"), undefined);
});

Deno.test("ChatAdapterRegistry: Registers and dynamically loads lazy adapters", async () => {
    const registry = new ChatAdapterRegistry();
    let loadCount = 0;
    const mockLazy = createMockAdapter("lazy-chat", "lazy.ai");

    registry.registerLazy({
        id: "lazy-chat",
        name: "Lazy AI",
        matches: (url) => url.hostname === "lazy.ai",
        load: () => {
            loadCount++;
            return Promise.resolve(mockLazy);
        },
    });

    assertEquals(registry.hasMatching("https://lazy.ai/chat"), true);
    assertEquals(registry.hasMatching("https://other.ai/"), false);

    // Before load, eager get is undefined
    assertEquals(registry.get("lazy-chat"), undefined);

    // Load via findAndLoad
    const loaded = await registry.findAndLoad("https://lazy.ai/chat");
    assertEquals(loaded, mockLazy);
    assertEquals(loadCount, 1);

    // Subsequent load uses cached loaded instance
    const loadedAgain = await registry.findAndLoad("https://lazy.ai/chat");
    assertEquals(loadedAgain, mockLazy);
    assertEquals(loadCount, 1, "Should reuse already loaded instance");
});

Deno.test("defaultChatRegistry: Lazily resolves and loads GeminiSiteAdapter by default", async () => {
    assertEquals(defaultChatRegistry.hasMatching("https://gemini.google.com/app"), true);
    const adapter = await defaultChatRegistry.findAndLoad("https://gemini.google.com/app");
    assertNotEquals(adapter, undefined);
    assertEquals(adapter?.id, "gemini");
});
