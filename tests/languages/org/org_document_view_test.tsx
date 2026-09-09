import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { OrgDocumentView } from "../../../src/languages/org/views/OrgDocumentView.tsx";
import { defaultAstCache } from "../../../src/store/astCache.ts";
import { computeContentHash } from "../../../src/core/utils/contentHash.ts";

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

function triggerClick(el: unknown) {
    if (el && typeof (el as { dispatchEvent?: unknown }).dispatchEvent === "function") {
        const target = el as { dispatchEvent: (ev: Event) => void; tagName?: string };
        target.dispatchEvent(new Event("click", { bubbles: true }));
        if (target.tagName === "INPUT") {
            target.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }
}

Deno.test("OrgDocumentView: Renders document title and caches AST in defaultAstCache", () => {
    const { root, cleanup } = setupDom();
    try {
        const content = `#+TITLE: Main Knowledge Base
* First Headline
Some introductory paragraph.
`;
        const hash = computeContentHash(content, "org");
        defaultAstCache.delete(hash, "org");

        render(
            <OrgDocumentView
                content={content}
                language="org"
            />,
            root,
        );

        // Verify title header
        const h1 = root.querySelector("header h1");
        assertNotEquals(h1, null);
        assertEquals(h1?.textContent?.trim(), "Main Knowledge Base");

        // Verify AST was placed in defaultAstCache
        const cachedAst = defaultAstCache.get(hash, "org");
        assertNotEquals(cachedAst, undefined);
    } finally {
        cleanup();
    }
});

Deno.test("OrgDocumentView: #+STARTUP: overview initializes headlines in folded state", () => {
    const { root, cleanup } = setupDom();
    try {
        const content = `#+STARTUP: overview
* Section One
Subtree content one.
* Section Two
Subtree content two.
`;
        render(
            <OrgDocumentView
                content={content}
                language="org"
            />,
            root,
        );

        // In overview mode, headlines start folded, so children/bodies are not rendered
        const bodies = root.querySelectorAll(".org-headline-body");
        assertEquals(bodies.length, 0);

        // Fold toggle buttons show collapsed glyph ▶
        const foldButtons = root.querySelectorAll("button.org-fold-toggle");
        assertEquals(foldButtons.length, 2);
        assertEquals(foldButtons[0].textContent?.includes("▶"), true);
    } finally {
        cleanup();
    }
});

Deno.test("OrgDocumentView: State hydration from documentViewState and onSaveViewState dispatch", async () => {
    const { root, cleanup } = setupDom();
    try {
        const content = `* TODO Top Task
Body text.
#+NAME: sample-block
#+BEGIN_SRC python
x = 10
#+END_SRC
- [ ] List task
`;
        let lastSavedState: unknown = null;

        // Render with initial saved state
        render(
            <OrgDocumentView
                content={content}
                language="org"
                documentViewState={{
                    foldedHeadlines: ["h-0"],
                    todoOverrides: { "h-0": "DONE" },
                }}
                onSaveViewState={(state: unknown) => {
                    lastSavedState = state;
                }}
            />,
            root,
        );

        // Headline should have DONE status from todoOverrides
        const todoBadge = root.querySelector("button.org-todo-badge");
        assertEquals(todoBadge?.textContent?.trim(), "DONE");

        // Headline is folded, body is hidden
        assertEquals(root.querySelector(".org-headline-body"), null);

        // Unfold headline by clicking fold button
        const foldBtn = root.querySelector("button.org-fold-toggle");
        assertNotEquals(foldBtn, null);
        triggerClick(foldBtn);

        // Allow Preact batched re-render
        await new Promise((r) => setTimeout(r, 20));

        // onSaveViewState should have been called with empty foldedHeadlines
        assertNotEquals(lastSavedState, null);
        const state1 = lastSavedState as { foldedHeadlines: string[]; todoOverrides: Record<string, string> };
        assertEquals(state1.foldedHeadlines.includes("h-0"), false);
        assertEquals(state1.todoOverrides["h-0"], "DONE");

        // Cycle TODO badge
        triggerClick(todoBadge);
        const state2 = lastSavedState as { todoOverrides: Record<string, string> };
        assertEquals(state2.todoOverrides["h-0"], "TODO");

        // Toggle block fold
        const blockHeader = root.querySelector(".org-block-container header");
        assertNotEquals(blockHeader, null);
        triggerClick(blockHeader);
        const state3 = lastSavedState as { foldedBlocks: string[] };
        assertEquals(state3.foldedBlocks.some((b) => b.includes("sample-block")), true);

        // Toggle checkbox
        const checkbox = root.querySelector('input[type="checkbox"]');
        assertNotEquals(checkbox, null);
        triggerClick(checkbox);
        const state4 = lastSavedState as { checkedItems: string[] };
        assertEquals(state4.checkedItems.some((i) => i.includes("i-0")), true);
    } finally {
        cleanup();
    }
});

Deno.test("OrgDocumentView: Internal links render with org-link-internal and navigate without throwing", () => {
    const { root, cleanup } = setupDom();
    try {
        const content = `* First Target Headline
Paragraph with a link to [[*First Target Headline][Go to Top]].
`;
        render(
            <OrgDocumentView
                content={content}
                language="org"
            />,
            root,
        );

        const link = root.querySelector("button.org-internal-link");
        assertNotEquals(link, null);
        assertEquals(link?.textContent?.trim(), "Go to Top");

        // Verify target headline exists with matching data-headline-title
        const target = root.querySelector('[data-headline-title="First Target Headline"]');
        assertNotEquals(target, null);

        // Click internal link
        triggerClick(link);
    } finally {
        cleanup();
    }
});
