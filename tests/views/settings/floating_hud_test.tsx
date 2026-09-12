import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { FloatingHud, mountHud } from "../../../src/views/settings/index.ts";
import { type ExtensionSettings, SettingsStore } from "../../../src/core/storage/settings.ts";

function triggerClick(el: unknown) {
    if (el && typeof (el as { dispatchEvent?: unknown }).dispatchEvent === "function") {
        (el as { dispatchEvent: (ev: Event) => void }).dispatchEvent(
            new Event("click", { bubbles: true }),
        );
    }
}

function setupDom() {
    const doc = new DOMParser().parseFromString(
        '<!DOCTYPE html><html><body><div id="mount-point"></div></body></html>',
        "text/html",
    );
    if (!doc) throw new Error("Failed to create mock DOM");

    interface GlobalDomScope {
        document?: unknown;
        Node?: unknown;
    }
    const scope = globalThis as unknown as GlobalDomScope;
    const origDoc = scope.document;
    const origNode = scope.Node;

    const origCreateElement = doc.createElement.bind(doc);
    const createElementShim = (tag: string) => {
        const el = origCreateElement(tag) as unknown as HTMLElement & {
            attachShadow: (init: { mode: string }) => unknown;
        };
        (el as unknown as { style: Record<string, string> }).style = {};
        el.attachShadow = () => {
            const shadow = origCreateElement("div") as unknown as ShadowRoot;
            (el as unknown as { shadowRoot: unknown }).shadowRoot = shadow;
            return shadow;
        };
        return el;
    };

    (doc as unknown as { createElement: (tag: string) => unknown }).createElement = createElementShim;

    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => createElementShim(tag);

    scope.document = doc;
    scope.Node = doc.body.constructor;

    const root = doc.getElementById("mount-point") as unknown as HTMLElement;

    return {
        doc,
        root,
        cleanup: () => {
            render(null, root);
            scope.document = origDoc;
            scope.Node = origNode;
        },
    };
}

Deno.test("FloatingHud: Renders title, collapse toggle, and active chat width controls", () => {
    const { root, cleanup } = setupDom();
    try {
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };

        render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={() => {}}
                theme="light"
            />,
            root,
        );

        const titleEl = root.querySelector(".ext-hud-title");
        assertNotEquals(titleEl, null);
        assertEquals(titleEl?.textContent?.includes("⚡ AI Chat UI"), true);

        const collapseBtn = root.querySelector(".ext-hud-collapse-btn");
        assertNotEquals(collapseBtn, null);
        assertEquals(collapseBtn?.textContent?.trim(), "−");

        const widthBtn = root.querySelector(".ext-hud-width-btn");
        assertNotEquals(widthBtn, null);
        assertEquals(widthBtn?.textContent?.includes("Width: 94%"), true);

        const presetBtns = root.querySelectorAll(".ext-hud-preset-btn");
        assertEquals(presetBtns.length, 4); // 80, 90, 94, 100
    } finally {
        cleanup();
    }
});

Deno.test("FloatingHud: Clicking header or collapse button collapses HUD into compact square", () => {
    const { root, cleanup } = setupDom();
    try {
        let updatedSettings: Partial<ExtensionSettings> = {};
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };

        render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    updatedSettings = { ...updatedSettings, ...partial };
                }}
                theme="light"
            />,
            root,
        );

        // Clicking the header bar directly collapses the HUD
        const header = root.querySelector(".ext-hud-header");
        assertNotEquals(header, null);
        triggerClick(header);

        assertEquals(updatedSettings.hudCollapsed, true);
    } finally {
        cleanup();
    }
});

Deno.test("FloatingHud: When collapsed, renders compact square with icon and expands on click", () => {
    const { root, cleanup } = setupDom();
    try {
        let updatedSettings: Partial<ExtensionSettings> = {};
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
        };

        render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    updatedSettings = { ...updatedSettings, ...partial };
                }}
                theme="light"
            />,
            root,
        );

        // Compact square element present with icon
        const collapsedSquare = root.querySelector(".ext-hud-collapsed");
        assertNotEquals(collapsedSquare, null);
        assertEquals(collapsedSquare?.className.includes("w-9"), true);
        assertEquals(collapsedSquare?.className.includes("h-9"), true);
        assertEquals(collapsedSquare?.textContent?.includes("⚡"), true);

        // Expanded body is NOT present
        assertEquals(root.querySelector(".ext-hud-body"), null);

        // Clicking collapsed square expands it
        triggerClick(collapsedSquare);
        assertEquals(updatedSettings.hudCollapsed, false);
    } finally {
        cleanup();
    }
});

Deno.test("FloatingHud: Clicking width button toggles fullWidth state", () => {
    const { root, cleanup } = setupDom();
    try {
        let updatedSettings: Partial<ExtensionSettings> = {};
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };

        render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    updatedSettings = { ...updatedSettings, ...partial };
                }}
                theme="light"
            />,
            root,
        );

        const widthBtn = root.querySelector(".ext-hud-width-btn");
        triggerClick(widthBtn);

        assertEquals(updatedSettings.fullWidth, false);
    } finally {
        cleanup();
    }
});

Deno.test("FloatingHud: Clicking preset button activates fullWidth and updates widthPercent", () => {
    const { root, cleanup } = setupDom();
    try {
        let updatedSettings: Partial<ExtensionSettings> = {};
        const settings: ExtensionSettings = {
            fullWidth: false,
            widthPercent: 94,
            hudCollapsed: false,
            autoRenderOrg: true,
        };

        render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    updatedSettings = { ...updatedSettings, ...partial };
                }}
                theme="dark"
            />,
            root,
        );

        const presetBtns = root.querySelectorAll(".ext-hud-preset-btn");
        const preset100 = Array.from(presetBtns).find((btn) => btn.textContent?.includes("100%"));
        assertNotEquals(preset100, undefined);

        triggerClick(preset100);

        assertEquals(updatedSettings.widthPercent, 100);
        assertEquals(updatedSettings.fullWidth, true);
    } finally {
        cleanup();
    }
});

Deno.test("mountHud: mounts inside dedicated container, handles theme updates, and unmounts cleanly", () => {
    const { doc, cleanup } = setupDom();
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

        assertNotEquals(handle, null);

        const container = doc.getElementById("ext-ai-chat-hud-root");
        assertNotEquals(container, null);
        assertEquals(container?.dataset.theme, "dark");

        // Updating theme updates container dataset
        handle?.updateTheme("light");
        assertEquals(container?.dataset.theme, "light");

        // Finding and clicking width button inside shadowRoot triggers onWidthChange
        const shadowRoot = (container as unknown as { shadowRoot: HTMLElement }).shadowRoot;
        const widthBtn = shadowRoot.querySelector(".ext-hud-width-btn");
        assertNotEquals(widthBtn, null);
        triggerClick(widthBtn);

        assertNotEquals(widthChanged, null);
        assertEquals((widthChanged as { fullWidth: boolean; widthPercent: number } | null)?.fullWidth, false);

        // Unmount removes container cleanly
        handle?.unmount();
        assertEquals(doc.getElementById("ext-ai-chat-hud-root"), null);
    } finally {
        cleanup();
    }
});

Deno.test("FloatingHud: clamps within chat column bounds and determines bilateral anchor", () => {
    const { root, cleanup } = setupDom();
    try {
        let updatedSettings: Partial<ExtensionSettings> = {};
        const settings: ExtensionSettings = {
            fullWidth: true,
            widthPercent: 94,
            hudCollapsed: true,
            autoRenderOrg: true,
            hudPosition: { x: 500, y: 300, anchor: "right" },
        };

        const mockBounds = {
            left: 200,
            right: 1000,
            top: 50,
            bottom: 800,
        };

        render(
            <FloatingHud
                settings={settings}
                onUpdateSettings={(partial) => {
                    updatedSettings = { ...updatedSettings, ...partial };
                }}
                getChatColumnBounds={() => mockBounds}
                theme="light"
            />,
            root,
        );

        const hudEl = root.querySelector(".ext-hud-collapsed");
        assertNotEquals(hudEl, null);

        const style = (hudEl as unknown as { style: Record<string, string> }).style;
        assertNotEquals(style.right, undefined);
    } finally {
        cleanup();
    }
});
