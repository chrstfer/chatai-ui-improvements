import { assertEquals, assertNotEquals } from "@std/assert";
import { setupTestDom } from "@internal/tests/fixtures";
import { DuckAiInjector } from "../../../../src/features/chats/duckai/injector.tsx";
import { DUCKAI_EXTENSION_INJECTED } from "../../../../src/features/chats/duckai/selectors.ts";
import type { DuckAiCodeBlockRef } from "../../../../src/features/chats/duckai/types.ts";

const TEST_HTML =
    '<!DOCTYPE html><html><body><div id="message-container"><div data-streamdown="code-block" data-language="org"><pre><code>* Task 1</code></pre></div></div></body></html>';

function createOrgBlockRef(doc: { querySelector: (s: string) => unknown }): DuckAiCodeBlockRef {
    const hostElement = doc.querySelector('div[data-streamdown="code-block"]') as unknown as HTMLElement;
    const codeElement = hostElement.querySelector("code") as unknown as HTMLElement;
    return {
        id: "block-1",
        hostElement,
        codeElement,
        rawCode: "* Task 1",
        rawHint: "org",
        formatId: "org",
        displayName: "Org Mode",
        isSettled: true,
    };
}

function createPythonBlockRef(doc: { querySelector: (s: string) => unknown }): DuckAiCodeBlockRef {
    const hostElement = doc.querySelector('div[data-streamdown="code-block"]') as unknown as HTMLElement;
    const codeElement = hostElement.querySelector("code") as unknown as HTMLElement;
    return {
        id: "block-python",
        hostElement,
        codeElement,
        rawCode: "print('hello')",
        rawHint: "python",
        formatId: "python",
        displayName: "Python",
        isSettled: true,
    };
}

Deno.test("integration: DuckAiInjector: - injects sibling container into DOM", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`);
        assertNotEquals(container, null);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - sets container class name", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`) as HTMLElement;
        assertEquals(container?.className, DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - sets host-id data attribute on container", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`) as HTMLElement;
        assertEquals(container?.dataset.hostId, "block-1");
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - sets ext-mounted data attribute on container", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`) as HTMLElement;
        assertEquals(container?.dataset.extMounted, "true");
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - sets siblingContainer reference on block ref", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`) as HTMLElement;
        assertEquals(blockRef.siblingContainer, container);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - hides native host element on injection", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        assertEquals(blockRef.hostElement.style.display, "none");
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - marks host element as processed on injection", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        assertEquals(blockRef.hostElement.getAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR), "true");
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - attaches shadow root to sibling container", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`) as HTMLElement;
        const shadowRoot = (container as unknown as { shadowRoot: unknown }).shadowRoot;
        assertNotEquals(shadowRoot, null);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - skips duplicate injection on same block ref", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.inject(blockRef, "light");
        const allContainers = doc.querySelectorAll(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`);
        assertEquals(allContainers.length, 1);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - removes sibling container on destroyAll", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.destroyAll();
        assertEquals(doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`), null);
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - restores native host element display on destroyAll", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.destroyAll();
        assertEquals(blockRef.hostElement.style.display, "");
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - removes processed attribute from host element on destroyAll", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.destroyAll();
        assertEquals(blockRef.hostElement.hasAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR), false);
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - bypasses unhandled formats without injecting sibling container", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createPythonBlockRef(doc);
        injector.inject(blockRef, "light");
        assertEquals(doc.querySelector(`.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}`), null);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - keeps native element visible when format is unhandled", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createPythonBlockRef(doc);
        injector.inject(blockRef, "light");
        assertEquals(!blockRef.hostElement.style.display, true);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - leaves native element unprocessed when format is unhandled", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createPythonBlockRef(doc);
        injector.inject(blockRef, "light");
        assertEquals(blockRef.hostElement.hasAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR), false);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - sets initial theme attribute on mounted container", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        const container = blockRef.siblingContainer as unknown as HTMLElement;
        assertEquals(container.dataset.theme, "light");
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - updates container theme attribute on updateThemes", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.updateThemes("dark");
        const container = blockRef.siblingContainer as unknown as HTMLElement;
        assertEquals(container.dataset.theme, "dark");
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - adds dark class to container when theme is dark", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.updateThemes("dark");
        const container = blockRef.siblingContainer as unknown as HTMLElement;
        assertEquals(container.classList.contains("dark"), true);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});

Deno.test("integration: DuckAiInjector: - removes dark class when theme is updated back to light", () => {
    const { doc, cleanup } = setupTestDom({ html: TEST_HTML });
    const injector = new DuckAiInjector();
    try {
        const blockRef = createOrgBlockRef(doc);
        injector.inject(blockRef, "light");
        injector.updateThemes("dark");
        injector.updateThemes("light");
        const container = blockRef.siblingContainer as unknown as HTMLElement;
        assertEquals(container.classList.contains("dark"), false);
    } finally {
        injector.destroyAll();
        cleanup();
    }
});
