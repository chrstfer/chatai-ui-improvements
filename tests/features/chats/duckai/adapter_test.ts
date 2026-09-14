import { assertEquals, assertNotEquals } from "@std/assert";
import { DuckAiSiteAdapter } from "../../../../src/features/chats/duckai/index.ts";
import { SettingsStore } from "../../../../src/core/storage/settings.ts";
import { setupTestDom } from "../../../fixtures/dom_fixture.ts";

Deno.test("unit: DuckAiSiteAdapter: has correct adapter id", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.id, "duckai");
});

Deno.test("unit: DuckAiSiteAdapter: has correct adapter display name", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.name, "DuckDuckGo AI");
});

Deno.test("unit: DuckAiSiteAdapter: matches root duck.ai domain", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://duck.ai/")), true);
});

Deno.test("unit: DuckAiSiteAdapter: matches conversation path on duck.ai", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://duck.ai/c/123")), true);
});

Deno.test("unit: DuckAiSiteAdapter: matches duckduckgo chat path", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://duckduckgo.com/chat")), true);
});

Deno.test("unit: DuckAiSiteAdapter: matches duckduckgo chat with query string", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://duckduckgo.com/chat?q=test")), true);
});

Deno.test("unit: DuckAiSiteAdapter: rejects non-chat duckduckgo root domain", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://duckduckgo.com/")), false);
});

Deno.test("unit: DuckAiSiteAdapter: rejects Gemini domain", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://gemini.google.com/app")), false);
});

Deno.test("unit: DuckAiSiteAdapter: rejects ChatGPT domain", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://chatgpt.com/")), false);
});

Deno.test("integration: DuckAiSiteAdapter: initialize injects layout stylesheet into document", () => {
    const { doc, cleanup } = setupTestDom();
    try {
        const adapter = new DuckAiSiteAdapter();
        adapter.initialize();
        const layoutStyle = doc.getElementById("ext-duckai-layout");
        assertNotEquals(layoutStyle, null);
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: initialize applies chat width variable from settings", () => {
    const { styleMap, cleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94 });
        const adapter = new DuckAiSiteAdapter({ store });
        adapter.initialize();
        assertEquals(styleMap["--ext-chat-max-width"], "94%");
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: initialize mounts floating HUD container", () => {
    const { doc, cleanup } = setupTestDom();
    try {
        const adapter = new DuckAiSiteAdapter();
        adapter.initialize();
        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(hudContainer, null);
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: settings update propagates new width variable", () => {
    const { styleMap, cleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94 });
        const adapter = new DuckAiSiteAdapter({ store });
        adapter.initialize();
        store.update({ widthPercent: 85 });
        assertEquals(styleMap["--ext-chat-max-width"], "85%");
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: destroy unmounts floating HUD", () => {
    const { doc, cleanup } = setupTestDom();
    try {
        const adapter = new DuckAiSiteAdapter();
        adapter.initialize();
        adapter.destroy();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null);
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: theme change updates HUD data-theme attribute", () => {
    const { doc, cleanup } = setupTestDom();
    try {
        let themeCallback: ((theme: "light" | "dark") => void) | null = null;
        const mockThemeAuthority = {
            supportsTheming: true,
            getTheme: () => "light" as const,
            onThemeChange: (cb: (theme: "light" | "dark") => void) => {
                themeCallback = cb;
                return () => {};
            },
            destroy: () => {},
        };

        const adapter = new DuckAiSiteAdapter({
            themeAuthority:
                mockThemeAuthority as unknown as import("../../../../src/features/chats/duckai/theme.ts").DuckAiThemeAuthority,
        });

        adapter.initialize();
        if (typeof themeCallback === "function") {
            (themeCallback as (theme: "light" | "dark") => void)("dark");
        }
        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertEquals(hudContainer?.dataset.theme, "dark");
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: getChatColumnBounds falls back to viewport bounds without sidebar", () => {
    const { cleanup } = setupTestDom();
    try {
        const adapter = new DuckAiSiteAdapter();
        const bounds = adapter.getChatColumnBounds();
        assertNotEquals(bounds, null);
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: getChatColumnBounds clamps left bound to sidebar right", () => {
    const { doc, cleanup } = setupTestDom();
    try {
        const adapter = new DuckAiSiteAdapter();
        const sidebar = doc.createElement("section");
        sidebar.setAttribute("data-testid", "duckai-sidebar");
        (sidebar as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({
            left: 0,
            right: 260,
            top: 0,
            bottom: 800,
            width: 260,
            height: 800,
            x: 0,
            y: 0,
            toJSON: () => {},
        });
        doc.body.appendChild(sidebar);
        const bounds = adapter.getChatColumnBounds();
        assertEquals(bounds?.left, 260);
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: handleThreadSwitch destroys active injector roots", () => {
    const { cleanup } = setupTestDom();
    try {
        let destroyAllCalled = false;
        const mockInjector = {
            inject: () => {},
            updateThemes: () => {},
            destroyAll: () => {
                destroyAllCalled = true;
            },
            reset: () => {},
        };
        const adapter = new DuckAiSiteAdapter({
            injector:
                mockInjector as unknown as import("../../../../src/features/chats/duckai/injector.tsx").DuckAiInjector,
        });
        adapter.initialize();
        adapter.handleThreadSwitch();
        assertEquals(destroyAllCalled, true);
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiSiteAdapter: handleThreadSwitch resets injector state", () => {
    const { cleanup } = setupTestDom();
    try {
        let resetCalled = false;
        const mockInjector = {
            inject: () => {},
            updateThemes: () => {},
            destroyAll: () => {},
            reset: () => {
                resetCalled = true;
            },
        };
        const adapter = new DuckAiSiteAdapter({
            injector:
                mockInjector as unknown as import("../../../../src/features/chats/duckai/injector.tsx").DuckAiInjector,
        });
        adapter.initialize();
        adapter.handleThreadSwitch();
        assertEquals(resetCalled, true);
        adapter.destroy();
    } finally {
        cleanup();
    }
});
