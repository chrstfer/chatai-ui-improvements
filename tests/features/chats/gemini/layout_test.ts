import { assertEquals } from "@std/assert";
import { type DocumentLike, GeminiLayoutController } from "../../../../src/features/chats/gemini/layout.ts";
import type { ExtensionSettings } from "../../../../src/contracts/core/index.ts";

function createMockDocument(): DocumentLike {
    const styleProperties: Record<string, string> = {};
    const classes = new Set<string>();
    const docClasses = new Set<string>();
    const elements = new Map<string, { id: string; textContent: string; remove: () => void }>();

    return {
        documentElement: {
            style: {
                setProperty: (prop: string, val: string) => {
                    styleProperties[prop] = val;
                },
                removeProperty: (prop: string) => {
                    delete styleProperties[prop];
                },
                getPropertyValue: (prop: string) => {
                    return styleProperties[prop] ?? "";
                },
            },
            classList: {
                add: (cls: string) => {
                    docClasses.add(cls);
                },
                remove: (cls: string) => {
                    docClasses.delete(cls);
                },
                toggle: (cls: string, force?: boolean) => {
                    const shouldAdd = force !== undefined ? force : !docClasses.has(cls);
                    if (shouldAdd) docClasses.add(cls);
                    else docClasses.delete(cls);
                    return docClasses.has(cls);
                },
                contains: (cls: string) => docClasses.has(cls),
            },
        },
        body: {
            classList: {
                add: (cls: string) => {
                    classes.add(cls);
                },
                remove: (cls: string) => {
                    classes.delete(cls);
                },
                toggle: (cls: string, force?: boolean) => {
                    const shouldAdd = force !== undefined ? force : !classes.has(cls);
                    if (shouldAdd) classes.add(cls);
                    else classes.delete(cls);
                    return classes.has(cls);
                },
                contains: (cls: string) => classes.has(cls),
            },
        },
        head: {
            appendChild: (child: unknown) => {
                const el = child as { id: string; textContent: string; remove: () => void };
                if (el.id) elements.set(el.id, el);
                return child;
            },
        },
        getElementById: (id: string) => elements.get(id) ?? null,
        createElement: (_tag: string) => {
            const el = {
                id: "",
                textContent: "",
                remove: () => {
                    if (el.id) elements.delete(el.id);
                },
            };
            return el;
        },
    };
}

Deno.test("GeminiLayoutController: initialize injects layout styles into document.head", () => {
    const doc = createMockDocument();
    const layout = new GeminiLayoutController();

    layout.initialize(doc);

    const styleEl = doc.getElementById?.("ext-gemini-layout") as { textContent: string } | null;
    assertEquals(styleEl !== null, true);
    assertEquals(styleEl?.textContent.includes("ext-fullwidth-active"), true);
    assertEquals(styleEl?.textContent.includes("--ext-chat-max-width"), true);
});

Deno.test("GeminiLayoutController: apply sets width variable and toggles body class", () => {
    const doc = createMockDocument();
    const layout = new GeminiLayoutController();

    const settings: ExtensionSettings = {
        fullWidth: true,
        widthPercent: 90,
        hudCollapsed: false,
        autoRenderOrg: true,
    };

    layout.apply(settings, doc);

    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), true);
    assertEquals(doc.documentElement?.classList?.contains("ext-fullwidth-active"), true);
    assertEquals(doc.documentElement?.style?.getPropertyValue?.("--ext-chat-max-width"), "90%");

    // Turn fullWidth off
    layout.apply({ ...settings, fullWidth: false }, doc);
    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), false);
    assertEquals(doc.documentElement?.classList?.contains("ext-fullwidth-active"), false);
    assertEquals(doc.documentElement?.style?.getPropertyValue?.("--ext-chat-max-width"), "90%");
});

Deno.test("GeminiLayoutController: destroy cleans up style element, variable, and body class", () => {
    const doc = createMockDocument();
    const layout = new GeminiLayoutController();

    layout.initialize(doc);
    layout.apply({ fullWidth: true, widthPercent: 94, hudCollapsed: false, autoRenderOrg: true }, doc);

    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), true);
    assertEquals(doc.documentElement?.classList?.contains("ext-fullwidth-active"), true);
    assertEquals(doc.getElementById?.("ext-gemini-layout") !== null, true);

    layout.destroy(doc);

    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), false);
    assertEquals(doc.documentElement?.classList?.contains("ext-fullwidth-active"), false);
    assertEquals(doc.getElementById?.("ext-gemini-layout"), null);
    assertEquals(doc.documentElement?.style?.getPropertyValue?.("--ext-chat-max-width"), "");
});
