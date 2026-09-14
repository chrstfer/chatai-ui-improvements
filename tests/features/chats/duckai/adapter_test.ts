import { assertEquals, assertNotEquals } from "@std/assert";
import { DuckAiSiteAdapter } from "../../../../src/features/chats/duckai/index.ts";
import { SettingsStore } from "../../../../src/core/storage/settings.ts";
import { setupTestDom } from "../../../fixtures/test_dom_helper.ts";

Deno.test("DuckAiSiteAdapter: URL matching covers duck.ai and duckduckgo.com/chat strictly", () => {
    const adapter = new DuckAiSiteAdapter();
    assertEquals(adapter.id, "duckai");
    assertEquals(adapter.name, "DuckDuckGo AI");

    assertEquals(adapter.matches(new URL("https://duck.ai/")), true);
    assertEquals(adapter.matches(new URL("https://duck.ai/c/123")), true);
    assertEquals(adapter.matches(new URL("https://duckduckgo.com/chat")), true);
    assertEquals(adapter.matches(new URL("https://duckduckgo.com/chat?q=test")), true);

    assertEquals(adapter.matches(new URL("https://duckduckgo.com/")), false);
    assertEquals(adapter.matches(new URL("https://gemini.google.com/app")), false);
    assertEquals(adapter.matches(new URL("https://chatgpt.com/")), false);
});

Deno.test("DuckAiSiteAdapter: initialize mounts HUD, layout styles, and syncs settings", () => {
    const { doc, styleMap, cleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94 });
        const adapter = new DuckAiSiteAdapter({ store });

        adapter.initialize();

        // 1. Layout style injected
        const layoutStyle = doc.getElementById("ext-duckai-layout");
        assertNotEquals(layoutStyle, null, "Layout style element should be injected into document");

        // 2. Chat width CSS variable and body class
        assertEquals(styleMap["--ext-chat-max-width"], "94%");
        assertEquals(doc.body.classList.contains("ext-fullwidth-active"), true);

        // 3. Floating HUD mounted
        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(hudContainer, null, "Floating HUD container should be mounted");

        // 4. Update settings
        store.update({ fullWidth: false, widthPercent: 85 });
        assertEquals(doc.body.classList.contains("ext-fullwidth-active"), false);
        assertEquals(styleMap["--ext-chat-max-width"], "85%");

        // 5. Cleanup
        adapter.destroy();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null, "HUD should be unmounted");
        assertEquals(doc.getElementById("ext-duckai-layout"), null, "Layout style should be removed");
        assertEquals(doc.body.classList.contains("ext-fullwidth-active"), false);
        assertEquals(styleMap["--ext-chat-max-width"], undefined);
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiSiteAdapter: Theme updates propagate to HUD and mounted containers", () => {
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

        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(hudContainer, null);
        assertEquals(hudContainer?.dataset.theme, "light");

        // Host theme changes to dark
        if (typeof themeCallback === "function") {
            (themeCallback as (theme: "light" | "dark") => void)("dark");
        }
        assertEquals(hudContainer?.dataset.theme, "dark");

        adapter.destroy();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null);
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiSiteAdapter: Calculates chat column bounds respecting sidebar", () => {
    const { doc, cleanup } = setupTestDom();
    try {
        const adapter = new DuckAiSiteAdapter();

        // 1. Fallback bounds without sidebar
        const fallbackBounds = adapter.getChatColumnBounds();
        assertNotEquals(fallbackBounds, null);
        assertEquals(typeof fallbackBounds?.left, "number");
        assertEquals(typeof fallbackBounds?.right, "number");

        // 2. With sidebar present
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

        const boundsWithSidebar = adapter.getChatColumnBounds();
        assertEquals(boundsWithSidebar?.left, 260);

        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiSiteAdapter: handleThreadSwitch cleans up previous thread and resets injector", () => {
    const { doc: _doc, cleanup } = setupTestDom();
    try {
        let destroyAllCalled = false;
        let resetCalled = false;

        const mockInjector = {
            inject: () => {},
            updateThemes: () => {},
            destroyAll: () => {
                destroyAllCalled = true;
            },
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
        assertEquals(destroyAllCalled, true, "Thread switch must tear down active roots");
        assertEquals(resetCalled, true, "Thread switch must reset injector state");

        adapter.destroy();
    } finally {
        cleanup();
    }
});
