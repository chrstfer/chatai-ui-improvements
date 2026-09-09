import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { OrgHeadlineView } from "../../../src/languages/org/views/OrgHeadlineView.tsx";
import type { OrgHeadlineElement } from "../../../src/languages/org/ast/types.ts";

function setupDom() {
    const doc = new DOMParser().parseFromString(
        '<!DOCTYPE html><html><body><div id="mount-point"></div></body></html>',
        "text/html",
    );
    if (!doc) throw new Error("Failed to create mock DOM");

    interface GlobalDomScope {
        document?: unknown;
        Node?: unknown;
        navigator?: unknown;
    }
    const scope = globalThis as unknown as GlobalDomScope;
    const origDoc = scope.document;
    const origNode = scope.Node;

    const origCreateElement = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
        const el = origCreateElement(tag);
        (el as unknown as { style: Record<string, string> }).style = {};
        return el;
    };

    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => {
        const el = doc.createElement(tag);
        return el;
    };

    scope.document = doc;
    scope.Node = doc.body.constructor;

    let clipboardText = "";
    Object.defineProperty(navigator, "clipboard", {
        value: {
            writeText: (text: string) => {
                clipboardText = text;
                return Promise.resolve();
            },
        },
        configurable: true,
    });

    const root = doc.getElementById("mount-point") as unknown as HTMLElement;

    return {
        doc,
        root,
        getClipboardText: () => clipboardText,
        cleanup: () => {
            render(null, root);
            scope.document = origDoc;
            scope.Node = origNode;
            // @ts-ignore cleanup mock
            delete (navigator as { clipboard?: unknown }).clipboard;
        },
    };
}

function triggerClick(el: unknown) {
    if (el && typeof (el as { dispatchEvent?: unknown }).dispatchEvent === "function") {
        const target = el as { dispatchEvent: (ev: Event) => void };
        target.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));
    }
}

Deno.test("OrgHeadlineView: Applies compact boxed card styling across levels H1-H6", () => {
    const { root, cleanup } = setupDom();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Level 1 Title" }],
            tags: [],
            children: [],
        };

        render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
            />,
            root,
        );

        const h1 = root.querySelector("h1.org-headline");
        assertNotEquals(h1, null);
        assertEquals(h1?.className.includes("text-[1.12rem]"), true);
        assertEquals(h1?.className.includes("border"), true);
        assertEquals(h1?.className.includes("rounded"), true);
        assertEquals(h1?.className.includes("cursor-pointer"), true);
    } finally {
        cleanup();
    }
});

Deno.test("OrgHeadlineView: Row click-to-fold toggles section fold state", () => {
    const { root, cleanup } = setupDom();
    try {
        let toggledId: string | null = null;
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 2,
            title: [{ type: "text", value: "Level 2 Title" }],
            tags: [],
            children: [],
        };

        render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-1"
                onToggleFold={(id) => {
                    toggledId = id;
                }}
            />,
            root,
        );

        const h2 = root.querySelector("h2.org-headline");
        assertNotEquals(h2, null);

        // Clicking the heading card invokes onToggleFold
        triggerClick(h2);
        assertEquals(toggledId, "h-1");
    } finally {
        cleanup();
    }
});

Deno.test("OrgHeadlineView: Event guard prevents row folding when clicking TODO badge or copy button", () => {
    const { root, cleanup } = setupDom();
    try {
        let foldCount = 0;
        let cycledStatus: string | null = null;
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            todoKeyword: "TODO",
            title: [{ type: "text", value: "Interactive Heading" }],
            tags: ["feature"],
            children: [],
        };

        render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
                onToggleFold={() => {
                    foldCount++;
                }}
                onCycleTodo={(_id, status) => {
                    cycledStatus = status;
                }}
            />,
            root,
        );

        // Clicking TODO badge should cycle TODO, but NOT toggle fold
        const todoBadge = root.querySelector("button.org-todo-badge");
        assertNotEquals(todoBadge, null);
        triggerClick(todoBadge);
        assertEquals(cycledStatus, "TODO");
        assertEquals(foldCount, 0, "TODO click must not toggle fold");

        // Clicking copy button must NOT toggle fold
        const copyBtn = root.querySelector("button.org-subtree-copy-btn");
        assertNotEquals(copyBtn, null);
        triggerClick(copyBtn);
        assertEquals(foldCount, 0, "Subtree copy click must not toggle fold");
    } finally {
        cleanup();
    }
});

Deno.test("OrgHeadlineView: Subtree copy button writes serialized Org subtree to clipboard", async () => {
    const { root, getClipboardText, cleanup } = setupDom();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            todoKeyword: "TODO",
            priority: "A",
            title: [{ type: "text", value: "Pipeline Automation" }],
            tags: ["dev", "ci"],
            planning: {
                type: "planning",
                deadline: "<2026-09-12 Sat>",
                raw: "DEADLINE: <2026-09-12 Sat>",
            },
            properties: {
                RUNNER: "linux-x64",
            },
            children: [
                {
                    type: "paragraph",
                    children: [{ type: "text", value: "Paragraph content in subtree." }],
                },
            ],
        };

        render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
            />,
            root,
        );

        const copyBtn = root.querySelector("button.org-subtree-copy-btn");
        assertNotEquals(copyBtn, null);
        triggerClick(copyBtn);

        // Allow clipboard Promise to resolve
        await new Promise((resolve) => setTimeout(resolve, 10));

        const text = getClipboardText();
        assertEquals(text.includes("* TODO [#A] Pipeline Automation :dev:ci:"), true);
        assertEquals(text.includes("DEADLINE: <2026-09-12 Sat>"), true);
        assertEquals(text.includes(":RUNNER: linux-x64"), true);
        assertEquals(text.includes("Paragraph content in subtree."), true);

        // Visual feedback should show Copied!
        assertEquals(copyBtn?.textContent?.includes("Copied!"), true);
    } finally {
        cleanup();
    }
});
