import { assertEquals, assertNotEquals } from "@std/assert";
import { GeminiSiteAdapter } from "../../../../src/features/chats/gemini/adapter.ts";
import { SettingsStore } from "../../../../src/core/storage/settings.ts";
import { setupTestDom } from "../../../fixtures/test_dom_helper.ts";

function setupDom() {
    return setupTestDom({
        html: '<!DOCTYPE html><html><head></head><body><div class="scroller"></div></body></html>',
        url: "https://gemini.google.com/app",
    });
}

Deno.test("GeminiSiteAdapter: Matches URL contract strictly for gemini.google.com", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.id, "gemini");
    assertEquals(adapter.name, "Google Gemini");
    assertEquals(adapter.matches(new URL("https://gemini.google.com/app")), true);
    assertEquals(adapter.matches(new URL("https://gemini.google.com/u/1/app")), true);
    assertEquals(adapter.matches(new URL("https://duck.ai/")), false);
    assertEquals(adapter.matches(new URL("https://chatgpt.com/")), false);
});

Deno.test("GeminiSiteAdapter: initialize mounts HUD, injects layout, and applies initial settings", () => {
    const { doc, styleMap, cleanup } = setupDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94 });
        const adapter = new GeminiSiteAdapter({ store });

        adapter.initialize();

        // 1. Injected style element in head
        const layoutStyle = doc.getElementById("ext-gemini-layout");
        assertNotEquals(layoutStyle, null, "Should inject layout stylesheet into head");

        // 2. Chat width CSS variable and body class
        assertEquals(styleMap["--ext-chat-max-width"], "94%");
        assertEquals(doc.body.classList.contains("ext-fullwidth-active"), true);

        // 3. Floating HUD mounted
        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(hudContainer, null, "Floating HUD container should be mounted in DOM");

        // 4. Updating settings propagates to layout
        store.update({ fullWidth: false, widthPercent: 80 });
        assertEquals(doc.body.classList.contains("ext-fullwidth-active"), false);
        assertEquals(styleMap["--ext-chat-max-width"], "80%");

        // 5. Cleanup via destroy
        adapter.destroy();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null, "HUD should be unmounted");
        assertEquals(doc.getElementById("ext-gemini-layout"), null, "Layout style should be removed");
        assertEquals(doc.body.classList.contains("ext-fullwidth-active"), false);
        assertEquals(styleMap["--ext-chat-max-width"], undefined);
    } finally {
        cleanup();
    }
});

Deno.test("GeminiSiteAdapter: theme change notifies HUD and updates dataset theme attribute", () => {
    const { doc, cleanup } = setupDom();
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

        const adapter = new GeminiSiteAdapter({
            themeAuthority:
                mockThemeAuthority as unknown as import("../../../../src/features/chats/gemini/theme.ts").GeminiThemeAuthority,
        });

        adapter.initialize();

        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(hudContainer, null);
        assertEquals(hudContainer?.dataset.theme, "light");

        // Simulate host theme change
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

Deno.test("GeminiSiteAdapter: exposes layoutController and computes chat column bounds", () => {
    const { doc, cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
        assertNotEquals(adapter.layoutController, undefined);

        // Without container element in mock doc, returns viewport fallback
        const fallbackBounds = adapter.getChatColumnBounds();
        assertNotEquals(fallbackBounds, null);
        assertEquals(typeof fallbackBounds?.right, "number");
        assertEquals(typeof fallbackBounds?.left, "number");

        // With conversation container
        const convEl = doc.createElement("div");
        convEl.className = "conversation-container";
        (convEl as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({
            left: 200,
            right: 1200,
            top: 50,
            bottom: 800,
            width: 1000,
            height: 750,
            x: 200,
            y: 50,
            toJSON: () => {},
        });
        doc.body.appendChild(convEl);

        const bounds = adapter.getChatColumnBounds();
        assertEquals(bounds?.left, 200);
        assertEquals(bounds?.right, 1200);

        // When collapsible sidebar is expanded to right: 288, left bound respects sidebar
        const sidebarEl = doc.createElement("bard-sidenav");
        (sidebarEl as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => ({
            left: 0,
            right: 288,
            top: 0,
            bottom: 800,
            width: 288,
            height: 800,
            x: 0,
            y: 0,
            toJSON: () => {},
        });
        doc.body.appendChild(sidebarEl);

        const boundsWithSidebar = adapter.getChatColumnBounds();
        assertEquals(boundsWithSidebar?.left, 288);
    } finally {
        cleanup();
    }
});
