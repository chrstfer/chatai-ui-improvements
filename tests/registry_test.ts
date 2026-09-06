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

Deno.test("ChatAdapterRegistry: Resolves matching adapter by URL and string", () => {
    const registry = new ChatAdapterRegistry();
    const mockA = createMockAdapter("gemini-test", "gemini.google.com");
    const mockB = createMockAdapter("duck-test", "duck.ai");

    registry.register(mockA);
    registry.register(mockB);

    assertEquals(registry.findMatching("https://gemini.google.com/app"), mockA);
    assertEquals(registry.findMatching(new URL("https://duck.ai/")), mockB);
    assertEquals(registry.findMatching("https://example.com/"), undefined);
});

Deno.test("defaultChatRegistry: Includes GeminiSiteAdapter by default", () => {
    const adapter = defaultChatRegistry.findMatching("https://gemini.google.com/app");
    assertNotEquals(adapter, undefined);
    assertEquals(adapter?.id, "gemini");
});
