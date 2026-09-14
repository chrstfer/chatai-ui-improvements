import { assertEquals, assertNotEquals } from "@std/assert";
import { GeminiSiteAdapter } from "../../../../src/features/chats/gemini/adapter.ts";
import { SettingsStore } from "@internal/core/storage";
import { setupTestDom } from "@internal/tests/fixtures";

function setupDom() {
    return setupTestDom({
        html: '<!DOCTYPE html><html><head></head><body><div class="scroller"></div></body></html>',
        url: "https://gemini.google.com/app",
    });
}

Deno.test("unit: GeminiSiteAdapter: has correct adapter id", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.id, "gemini");
});

Deno.test("unit: GeminiSiteAdapter: has correct adapter display name", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.name, "Google Gemini");
});

Deno.test("unit: GeminiSiteAdapter: matches standard Gemini app URL", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://gemini.google.com/app")), true);
});

Deno.test("unit: GeminiSiteAdapter: matches multi-user profile Gemini app URL", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://gemini.google.com/u/1/app")), true);
});

Deno.test("unit: GeminiSiteAdapter: rejects Duck.ai URL", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://duck.ai/")), false);
});

Deno.test("unit: GeminiSiteAdapter: rejects ChatGPT URL", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.matches(new URL("https://chatgpt.com/")), false);
});

Deno.test("integration: GeminiSiteAdapter: initialize injects layout stylesheet into document head", () => {
    const { doc, cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
        adapter.initialize();
        const layoutStyle = doc.getElementById("ext-gemini-layout");
        assertNotEquals(layoutStyle, null);
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: initialize applies chat width variable from settings", () => {
    const { styleMap, cleanup } = setupDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94 });
        const adapter = new GeminiSiteAdapter({ store });
        adapter.initialize();
        assertEquals(styleMap["--ext-chat-max-width"], "94%");
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: initialize mounts floating HUD container", () => {
    const { doc, cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
        adapter.initialize();
        const hudContainer = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(hudContainer, null);
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: settings update propagates new width variable", () => {
    const { styleMap, cleanup } = setupDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94 });
        const adapter = new GeminiSiteAdapter({ store });
        adapter.initialize();
        store.update({ widthPercent: 80 });
        assertEquals(styleMap["--ext-chat-max-width"], "80%");
        adapter.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: destroy unmounts floating HUD", () => {
    const { doc, cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
        adapter.initialize();
        adapter.destroy();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null);
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: theme change updates HUD data-theme attribute", () => {
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

Deno.test("integration: GeminiSiteAdapter: getChatColumnBounds falls back to viewport bounds when no container", () => {
    const { cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
        const bounds = adapter.getChatColumnBounds();
        assertNotEquals(bounds, null);
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: getChatColumnBounds reads conversation container rect", () => {
    const { doc, cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
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
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiSiteAdapter: getChatColumnBounds clamps left bound to expanded sidebar", () => {
    const { doc, cleanup } = setupDom();
    try {
        const adapter = new GeminiSiteAdapter();
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

        const bounds = adapter.getChatColumnBounds();
        assertEquals(bounds?.left, 288);
    } finally {
        cleanup();
    }
});
