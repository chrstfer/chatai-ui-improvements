import { assertEquals } from "@std/assert";
import { type DocumentLike, DuckAiLayoutController } from "../../../../src/features/chats/duckai/layout.ts";
import type { ExtensionSettings } from "@internal/contracts/core";

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

Deno.test("unit: DuckAiLayoutController: initialize injects layout styles into document.head", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    layout.initialize(doc);
    const styleEl = doc.getElementById?.("ext-duckai-layout") as { textContent: string } | null;
    assertEquals(styleEl !== null, true);
});

Deno.test("unit: DuckAiLayoutController: initialize stylesheet contains --ext-chat-max-width rules", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    layout.initialize(doc);
    const styleEl = doc.getElementById?.("ext-duckai-layout") as { textContent: string } | null;
    assertEquals(styleEl?.textContent.includes("--ext-chat-max-width"), true);
});

Deno.test("unit: DuckAiLayoutController: apply adds ext-fullwidth-active class to body when fullWidth is true", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    const settings: ExtensionSettings = {
        fullWidth: true,
        widthPercent: 92,
        hudCollapsed: false,
        autoRenderOrg: true,
    };
    layout.apply(settings, doc);
    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), true);
});

Deno.test("unit: DuckAiLayoutController: apply sets --ext-chat-max-width CSS variable to configured percentage", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    const settings: ExtensionSettings = {
        fullWidth: true,
        widthPercent: 92,
        hudCollapsed: false,
        autoRenderOrg: true,
    };
    layout.apply(settings, doc);
    assertEquals(doc.documentElement?.style?.getPropertyValue?.("--ext-chat-max-width"), "92%");
});

Deno.test("unit: DuckAiLayoutController: apply removes ext-fullwidth-active class when fullWidth is false", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    const settings: ExtensionSettings = {
        fullWidth: false,
        widthPercent: 92,
        hudCollapsed: false,
        autoRenderOrg: true,
    };
    layout.apply(settings, doc);
    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), false);
});

Deno.test("unit: DuckAiLayoutController: destroy removes ext-fullwidth-active class from body", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    layout.initialize(doc);
    layout.apply({ fullWidth: true, widthPercent: 94, hudCollapsed: false, autoRenderOrg: true }, doc);
    layout.destroy(doc);
    assertEquals(doc.body?.classList?.contains("ext-fullwidth-active"), false);
});

Deno.test("unit: DuckAiLayoutController: destroy removes injected layout style element", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    layout.initialize(doc);
    layout.apply({ fullWidth: true, widthPercent: 94, hudCollapsed: false, autoRenderOrg: true }, doc);
    layout.destroy(doc);
    assertEquals(doc.getElementById?.("ext-duckai-layout"), null);
});

Deno.test("unit: DuckAiLayoutController: destroy resets --ext-chat-max-width CSS variable", () => {
    const doc = createMockDocument();
    const layout = new DuckAiLayoutController();
    layout.initialize(doc);
    layout.apply({ fullWidth: true, widthPercent: 94, hudCollapsed: false, autoRenderOrg: true }, doc);
    layout.destroy(doc);
    assertEquals(doc.documentElement?.style?.getPropertyValue?.("--ext-chat-max-width"), "");
});
