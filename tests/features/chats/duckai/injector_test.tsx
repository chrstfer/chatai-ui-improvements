import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { DuckAiInjector } from "../../../../src/features/chats/duckai/injector.tsx";
import { DUCKAI_EXTENSION_INJECTED } from "../../../../src/features/chats/duckai/selectors.ts";
import type { DuckAiCodeBlockRef } from "../../../../src/features/chats/duckai/types.ts";

function setupDom() {
    const doc = new DOMParser().parseFromString(
        '<!DOCTYPE html><html><body><div id="message-container"><div data-streamdown="code-block" data-language="org"><pre><code>* Task 1</code></pre></div></div></body></html>',
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

    doc.querySelectorAll("*").forEach((el) => {
        (el as unknown as { style: Record<string, string> }).style = {};
    });

    (doc as unknown as { createElement: (tag: string) => unknown }).createElement = createElementShim;
    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => createElementShim(tag);

    scope.document = doc;
    scope.Node = doc.body.constructor;

    return {
        doc,
        cleanup: () => {
            scope.document = origDoc;
            scope.Node = origNode;
        },
    };
}

Deno.test("DuckAiInjector: Injects sibling container before code-block and hides native block", () => {
    const { doc, cleanup } = setupDom();
    try {
        const hostElement = doc.querySelector('div[data-streamdown="code-block"]') as unknown as HTMLElement;
        const codeElement = hostElement.querySelector("code") as unknown as HTMLElement;

        const blockRef: DuckAiCodeBlockRef = {
            id: "block-1",
            hostElement,
            codeElement,
            rawCode: "* Task 1",
            rawHint: "org",
            formatId: "org",
            displayName: "Org Mode",
            isSettled: true,
        };

        const injector = new DuckAiInjector();
        injector.inject(blockRef, "light");

        // 1. Sibling container should be inserted before hostElement
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`);
        assertNotEquals(container, null, "Injected sibling container should be present in DOM");
        assertEquals(container?.getAttribute("class"), DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS);

        // 2. Native element hidden and marked processed
        assertEquals(hostElement.style.display, "none");
        assertEquals(hostElement.getAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR), "true");

        // 3. Shadow Root attached
        const shadowRoot = (container as unknown as { shadowRoot: unknown }).shadowRoot;
        assertNotEquals(shadowRoot, null, "Open Shadow Root must be attached to container");

        // 4. Duplicate injection guard
        injector.inject(blockRef, "light");
        const allContainers = doc.querySelectorAll(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`);
        assertEquals(allContainers.length, 1, "Duplicate injection must be safely prevented");

        // 5. Cleanup
        injector.destroyAll();
        assertEquals(doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`), null);
        assertEquals(hostElement.style.display, "");
        assertEquals(hostElement.hasAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR), false);
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiInjector: Non-destructive host bypass when format has no registered rendered view", () => {
    const { doc, cleanup } = setupDom();
    try {
        const hostElement = doc.querySelector('div[data-streamdown="code-block"]') as unknown as HTMLElement;
        const codeElement = hostElement.querySelector("code") as unknown as HTMLElement;

        const pythonBlockRef: DuckAiCodeBlockRef = {
            id: "block-python",
            hostElement,
            codeElement,
            rawCode: "print('hello')",
            rawHint: "python",
            formatId: "python",
            displayName: "Python",
            isSettled: true,
        };

        const injector = new DuckAiInjector();
        injector.inject(pythonBlockRef, "light");

        // No sibling container should be created for unhandled format
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`);
        assertEquals(container, null, "Injector must bypass unhandled formats without injecting");

        // Native block must remain visible and untouched
        assertEquals(!hostElement.style.display, true);
        assertEquals(hostElement.hasAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR), false);

        injector.destroyAll();
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiInjector: updateThemes updates mounted containers", () => {
    const { doc, cleanup } = setupDom();
    try {
        const hostElement = doc.querySelector('div[data-streamdown="code-block"]') as unknown as HTMLElement;
        const codeElement = hostElement.querySelector("code") as unknown as HTMLElement;

        const blockRef: DuckAiCodeBlockRef = {
            id: "block-theme",
            hostElement,
            codeElement,
            rawCode: "* Task with theme",
            rawHint: "org",
            formatId: "org",
            displayName: "Org Mode",
            isSettled: true,
        };

        const injector = new DuckAiInjector();
        injector.inject(blockRef, "light");

        const container = blockRef.siblingContainer as unknown as HTMLElement;
        assertNotEquals(container, null);
        assertEquals(container.dataset.theme, "light");

        injector.updateThemes("dark");
        assertEquals(container.dataset.theme, "dark");
        assertEquals(container.classList.contains("dark"), true);

        injector.updateThemes("light");
        assertEquals(container.dataset.theme, "light");
        assertEquals(container.classList.contains("dark"), false);

        injector.destroyAll();
    } finally {
        cleanup();
    }
});
