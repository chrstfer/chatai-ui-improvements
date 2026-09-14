import { assertEquals, assertNotEquals } from "@std/assert";
import { cleanup, render } from "@testing-library/preact";
import { setupTestDom, triggerClick } from "../../fixtures/dom_fixture.ts";
import { FloatingHud, mountHud } from "../../../src/views/settings/index.ts";
import { type ExtensionSettings, SettingsStore } from "../../../src/core/storage/settings.ts";

Deno.test("unit: FloatingHud: renders title with AI Chat UI brand", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        const titleEl = container.querySelector(".ext-hud-title");
        assertEquals(titleEl?.textContent?.includes("⚡ AI Chat UI"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: renders collapse button with minus symbol", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        const collapseBtn = container.querySelector(".ext-hud-collapse-btn");
        assertEquals(collapseBtn?.textContent?.trim(), "−");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: renders current chat width percentage on width button", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        const widthBtn = container.querySelector(".ext-hud-width-btn");
        assertEquals(widthBtn?.textContent?.includes("Width: 94%"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: renders four width preset buttons", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        const presetBtns = container.querySelectorAll(".ext-hud-preset-btn");
        assertEquals(presetBtns.length, 4);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: collapses HUD when clicking header bar", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let collapsed = false;
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    if (partial.hudCollapsed !== undefined) collapsed = partial.hudCollapsed;
                }}
                theme="light"
            />,
        );
        const header = container.querySelector(".ext-hud-header");
        triggerClick(header);
        assertEquals(collapsed, true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: renders compact square when collapsed", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        const collapsedSquare = container.querySelector(".ext-hud-collapsed");
        assertNotEquals(collapsedSquare, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: renders icon inside compact square when collapsed", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        const collapsedSquare = container.querySelector(".ext-hud-collapsed");
        assertEquals(collapsedSquare?.textContent?.includes("⚡"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: hides expanded body when collapsed", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud settings={settings} onUpdateSettings={() => {}} theme="light" />,
        );
        assertEquals(container.querySelector(".ext-hud-body"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: expands HUD when clicking collapsed square", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let collapsed = true;
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    if (partial.hudCollapsed !== undefined) collapsed = partial.hudCollapsed;
                }}
                theme="light"
            />,
        );
        const collapsedSquare = container.querySelector(".ext-hud-collapsed");
        triggerClick(collapsedSquare);
        assertEquals(collapsed, false);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: toggles fullWidth state when width button clicked", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let fullWidth = true;
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    if (partial.fullWidth !== undefined) fullWidth = partial.fullWidth;
                }}
                theme="light"
            />,
        );
        const widthBtn = container.querySelector(".ext-hud-width-btn");
        triggerClick(widthBtn);
        assertEquals(fullWidth, false);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: activates fullWidth when preset button clicked", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let fullWidth = false;
        const settings: ExtensionSettings = {
            fullWidth: false,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    if (partial.fullWidth !== undefined) fullWidth = partial.fullWidth;
                }}
                theme="dark"
            />,
        );
        const presetBtns = container.querySelectorAll(".ext-hud-preset-btn");
        const preset100 = Array.from(presetBtns).find((btn) => btn.textContent?.includes("100%"));
        triggerClick(preset100);
        assertEquals(fullWidth, true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: updates widthPercent when preset button clicked", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let widthPercent = 94;
        const settings: ExtensionSettings = {
            fullWidth: false,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };
        const { container } = render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    if (partial.widthPercent !== undefined) widthPercent = partial.widthPercent;
                }}
                theme="dark"
            />,
        );
        const presetBtns = container.querySelectorAll(".ext-hud-preset-btn");
        const preset100 = Array.from(presetBtns).find((btn) => btn.textContent?.includes("100%"));
        triggerClick(preset100);
        assertEquals(widthPercent, 100);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: FloatingHud: computes style positioning with anchor from chat column bounds", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
            hudPosition: { x: 500, y: 300, anchor: "right" },
        };
        const mockBounds = { left: 200, right: 1000, top: 50, bottom: 800 };
        const { container } = render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={() => {}}
                getChatColumnBounds={() => mockBounds}
                theme="light"
            />,
        );
        const hudEl = container.querySelector(".ext-hud-collapsed");
        const style = (hudEl as unknown as { style: Record<string, string> }).style;
        assertNotEquals(style.right, undefined);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("integration: FloatingHudMount: mountHud creates root container element in document", () => {
    const { doc, cleanup: domCleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94, hudCollapsed: false });
        const handle = mountHud({ store, theme: "dark", host: "gemini" });
        const container = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(container, null);
        handle?.unmount();
    } finally {
        domCleanup();
    }
});

Deno.test("integration: FloatingHudMount: mountHud sets initial theme on container dataset", () => {
    const { doc, cleanup: domCleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94, hudCollapsed: false });
        const handle = mountHud({ store, theme: "dark", host: "gemini" });
        const container = doc.getElementById("ext-ai-chat-hud-root");
        assertEquals(container?.dataset.theme, "dark");
        handle?.unmount();
    } finally {
        domCleanup();
    }
});

Deno.test("integration: FloatingHudMount: mountHud updates theme on container dataset via updateTheme", () => {
    const { doc, cleanup: domCleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94, hudCollapsed: false });
        const handle = mountHud({ store, theme: "dark", host: "gemini" });
        handle?.updateTheme("light");
        const container = doc.getElementById("ext-ai-chat-hud-root");
        assertEquals(container?.dataset.theme, "light");
        handle?.unmount();
    } finally {
        domCleanup();
    }
});

Deno.test("integration: FloatingHudMount: mountHud triggers onWidthChange callback when width button clicked", () => {
    const { doc, cleanup: domCleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94, hudCollapsed: false });
        let widthChanged: { fullWidth: boolean; widthPercent: number } | null = null;
        const handle = mountHud({
            store,
            theme: "dark",
            host: "gemini",
            onWidthChange: (fullWidth, widthPercent) => {
                widthChanged = { fullWidth, widthPercent };
            },
        });
        const container = doc.getElementById("ext-ai-chat-hud-root");
        const shadowRoot = (container as unknown as { shadowRoot: HTMLElement }).shadowRoot;
        const widthBtn = shadowRoot.querySelector(".ext-hud-width-btn");
        triggerClick(widthBtn);
        assertEquals((widthChanged as unknown as { fullWidth: boolean })?.fullWidth, false);
        handle?.unmount();
    } finally {
        domCleanup();
    }
});

Deno.test("integration: FloatingHudMount: mountHud removes container element from document on unmount", () => {
    const { doc, cleanup: domCleanup } = setupTestDom();
    try {
        const store = new SettingsStore({ fullWidth: true, widthPercent: 94, hudCollapsed: false });
        const handle = mountHud({ store, theme: "dark", host: "gemini" });
        handle?.unmount();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null);
    } finally {
        domCleanup();
    }
});
