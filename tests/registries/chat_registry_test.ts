/**
 * Chat Adapter Registry Test Suite.
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import { ChatAdapterRegistry, defaultChatRegistry } from "../../src/registries/chatRegistry.ts";
import type { SiteAdapter } from "../../src/contracts/chats/index.ts";

function createMockSiteAdapter(id: string, hostname: string): SiteAdapter {
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

Deno.test("ChatAdapterRegistry: Registers, lazily loads, and unregisters site adapters", async () => {
    const registry = new ChatAdapterRegistry();
    let loadCount = 0;
    const mock = createMockSiteAdapter("test-host", "test.host.ai");

    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: async () => {
            loadCount++;
            return mock;
        },
    });

    assertEquals(registry.hasMatching("https://test.host.ai/chat"), true);
    assertEquals(registry.hasMatching("https://other.ai/"), false);

    // Initial load
    const loaded = await registry.findAndLoad("https://test.host.ai/chat");
    assertEquals(loaded, mock);
    assertEquals(loadCount, 1);

    // Cached load
    const cached = await registry.findAndLoad("https://test.host.ai/chat");
    assertEquals(cached, mock);
    assertEquals(loadCount, 1, "Should reuse cached loaded instance");

    // Fresh reload option
    const fresh = await registry.findAndLoad("https://test.host.ai/chat", { fresh: true });
    assertEquals(fresh, mock);
    assertEquals(loadCount, 2, "Should invoke factory again when fresh is requested");

    // Unload
    assertEquals(registry.unload("test-host"), true);
    assertEquals(registry.unload("test-host"), false);

    // Unregister
    assertEquals(registry.unregister("test-host"), true);
    assertEquals(registry.hasMatching("https://test.host.ai/chat"), false);
});

Deno.test("ChatAdapterRegistry: defaultChatRegistry lazily resolves and loads GeminiSiteAdapter", async () => {
    assertEquals(defaultChatRegistry.hasMatching("https://gemini.google.com/app"), true);
    const adapter = await defaultChatRegistry.findAndLoad("https://gemini.google.com/app");
    assertNotEquals(adapter, undefined);
    assertEquals(adapter?.id, "gemini");
});
