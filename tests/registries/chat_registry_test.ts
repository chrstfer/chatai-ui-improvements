/**
 * Chat Adapter Registry Test Suite.
 */

import { assertEquals } from "@std/assert";
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

Deno.test("unit: ChatAdapterRegistry hasMatching returns true for matched host URL", () => {
    const registry = new ChatAdapterRegistry();
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => Promise.resolve(mock),
    });
    const result = registry.hasMatching("https://test.host.ai/chat");
    assertEquals(result, true);
});

Deno.test("unit: ChatAdapterRegistry hasMatching returns false for unmatched host URL", () => {
    const registry = new ChatAdapterRegistry();
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => Promise.resolve(mock),
    });
    const result = registry.hasMatching("https://other.ai/");
    assertEquals(result, false);
});

Deno.test("unit: ChatAdapterRegistry findAndLoad resolves matching site adapter", async () => {
    const registry = new ChatAdapterRegistry();
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => Promise.resolve(mock),
    });
    const loaded = await registry.findAndLoad("https://test.host.ai/chat");
    assertEquals(loaded?.id, "test-host");
});

Deno.test("unit: ChatAdapterRegistry caches loaded adapter instance across calls", async () => {
    const registry = new ChatAdapterRegistry();
    let loadCount = 0;
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => {
            loadCount++;
            return Promise.resolve(mock);
        },
    });
    await registry.findAndLoad("https://test.host.ai/chat");
    await registry.findAndLoad("https://test.host.ai/chat");
    assertEquals(loadCount, 1);
});

Deno.test("unit: ChatAdapterRegistry reloads factory when fresh option is true", async () => {
    const registry = new ChatAdapterRegistry();
    let loadCount = 0;
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => {
            loadCount++;
            return Promise.resolve(mock);
        },
    });
    await registry.findAndLoad("https://test.host.ai/chat");
    await registry.findAndLoad("https://test.host.ai/chat", { fresh: true });
    assertEquals(loadCount, 2);
});

Deno.test("unit: ChatAdapterRegistry unload evicts cached instance", async () => {
    const registry = new ChatAdapterRegistry();
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => Promise.resolve(mock),
    });
    await registry.findAndLoad("https://test.host.ai/chat");
    const unloaded = registry.unload("test-host");
    assertEquals(unloaded, true);
});

Deno.test("unit: ChatAdapterRegistry unregister removes adapter definition", () => {
    const registry = new ChatAdapterRegistry();
    const mock = createMockSiteAdapter("test-host", "test.host.ai");
    registry.register({
        id: "test-host",
        name: "Test Host",
        matches: (url) => url.hostname === "test.host.ai",
        load: () => Promise.resolve(mock),
    });
    registry.unregister("test-host");
    const result = registry.hasMatching("https://test.host.ai/chat");
    assertEquals(result, false);
});

Deno.test("integration: defaultChatRegistry matches Gemini chat URL", () => {
    const result = defaultChatRegistry.hasMatching("https://gemini.google.com/app");
    assertEquals(result, true);
});

Deno.test("integration: defaultChatRegistry lazily loads GeminiSiteAdapter", async () => {
    const adapter = await defaultChatRegistry.findAndLoad("https://gemini.google.com/app");
    assertEquals(adapter?.id, "gemini");
});

Deno.test("integration: defaultChatRegistry matches Duck.ai root URL", () => {
    const result = defaultChatRegistry.hasMatching("https://duck.ai/");
    assertEquals(result, true);
});

Deno.test("integration: defaultChatRegistry matches DuckDuckGo chat URL", () => {
    const result = defaultChatRegistry.hasMatching("https://duckduckgo.com/chat");
    assertEquals(result, true);
});

Deno.test("integration: defaultChatRegistry rejects non-chat DuckDuckGo URL", () => {
    const result = defaultChatRegistry.hasMatching("https://duckduckgo.com/");
    assertEquals(result, false);
});

Deno.test("integration: defaultChatRegistry lazily loads DuckAiSiteAdapter", async () => {
    const adapter = await defaultChatRegistry.findAndLoad("https://duck.ai/");
    assertEquals(adapter?.id, "duckai");
});
