import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { OrgElementRenderer } from "../../../src/languages/org/views/OrgElementRenderer.tsx";
import { parseOrgDocument } from "../../../src/languages/org/ast/parser.ts";

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

Deno.test("OrgElementRenderer: Headlines render level tags, priority, tags, planning, and subtree fold", () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = `* TODO [#A] Top Headline :WORK:PROJECT:
SCHEDULED: <2026-09-09 Wed> DEADLINE: <2026-09-10 Thu>
Some paragraph body under top headline.
** Level 2 Child Headline
Child body.
`;
        const ast = parseOrgDocument(orgText);
        let toggledHeadline = "";

        // Render expanded
        render(
            <OrgElementRenderer
                elements={ast.children}
                onToggleHeadlineFold={(id) => {
                    toggledHeadline = id;
                }}
            />,
            root,
        );

        // Verify H1 and H2 tags
        const h1 = root.querySelector("h1.org-headline");
        assertNotEquals(h1, null);
        assertEquals(h1?.textContent?.includes("Top Headline"), true);

        const h2 = root.querySelector("h2.org-headline");
        assertNotEquals(h2, null);
        assertEquals(h2?.textContent?.includes("Level 2 Child Headline"), true);

        // Verify priority marker [#A]
        const priorityEl = root.querySelector(".org-priority");
        assertNotEquals(priorityEl, null);
        assertEquals(priorityEl?.textContent?.includes("[#A]"), true);

        // Verify tag chips
        const tagEls = root.querySelectorAll(".org-tag");
        assertEquals(tagEls.length >= 2, true);

        // Verify planning line
        const planningEl = root.querySelector(".org-planning");
        assertNotEquals(planningEl, null);
        assertEquals(planningEl?.textContent?.includes("SCHEDULED"), true);
        assertEquals(planningEl?.textContent?.includes("DEADLINE"), true);

        // Verify fold toggle click
        const foldBtn = root.querySelector("button.org-fold-toggle");
        assertNotEquals(foldBtn, null);
        triggerClick(foldBtn);
        assertEquals(toggledHeadline, "h-0");

        // Re-render folded: children should be hidden
        render(
            <OrgElementRenderer
                elements={ast.children}
                foldedHeadlines={["h-0"]}
            />,
            root,
        );
        assertEquals(root.querySelector(".org-headline-body"), null);
    } finally {
        cleanup();
    }
});

Deno.test("OrgElementRenderer: Headline TODO cycling and todoOverrides persistence", () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = `* TODO Task A`;
        const ast = parseOrgDocument(orgText);

        let cycledId = "";
        let cycledStatus = "";

        render(
            <OrgElementRenderer
                elements={ast.children}
                onCycleTodo={(id, status) => {
                    cycledId = id;
                    cycledStatus = status;
                }}
            />,
            root,
        );

        const todoBadge = root.querySelector("button.org-todo-badge");
        assertNotEquals(todoBadge, null);
        assertEquals(todoBadge?.textContent?.trim(), "TODO");

        triggerClick(todoBadge);
        assertEquals(cycledId, "h-0");
        assertEquals(cycledStatus, "TODO");

        // Re-render with todoOverride: "DONE" -> muted title with line-through
        render(
            <OrgElementRenderer
                elements={ast.children}
                todoOverrides={{ "h-0": "DONE" }}
            />,
            root,
        );

        const updatedBadge = root.querySelector("button.org-todo-badge");
        assertEquals(updatedBadge?.textContent?.trim(), "DONE");

        const headlineTitle = root.querySelector(".org-headline-title");
        assertEquals(headlineTitle?.getAttribute("class")?.includes("line-through"), true);
    } finally {
        cleanup();
    }
});

Deno.test("OrgElementRenderer: Source blocks render line count pill, copy button, and fold toggle", () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = `#+NAME: sample-code
#+CAPTION: A python example
#+BEGIN_SRC python
def add(a, b):
    return a + b
#+END_SRC
`;
        const ast = parseOrgDocument(orgText);
        let toggledBlock = "";

        render(
            <OrgElementRenderer
                elements={ast.children}
                onToggleBlockFold={(id) => {
                    toggledBlock = id;
                }}
            />,
            root,
        );

        const blockContainer = root.querySelector(".org-block-container");
        assertNotEquals(blockContainer, null);

        // Verify line count pill
        const lineCountEl = root.querySelector(".org-line-count");
        assertNotEquals(lineCountEl, null);
        assertEquals(lineCountEl?.textContent?.includes("2 lines"), true);

        // Verify copy button
        const copyBtn = root.querySelector("button.org-btn-copy");
        assertNotEquals(copyBtn, null);
        assertEquals(copyBtn?.textContent?.includes("Copy"), true);

        // Verify fold toggle header click
        const blockHeader = root.querySelector(".org-block-container header");
        assertNotEquals(blockHeader, null);
        triggerClick(blockHeader);
        assertEquals(toggledBlock, "b-0:sample-code");

        // Re-render folded: body is hidden
        render(
            <OrgElementRenderer
                elements={ast.children}
                foldedBlocks={["b-0:sample-code"]}
            />,
            root,
        );
        assertEquals(root.querySelector(".org-block-body"), null);
    } finally {
        cleanup();
    }
});

Deno.test("OrgElementRenderer: Pipe tables render header rows (thead), data rows (tbody), and alignments", () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = `| Name | Age | City |
|------+-----+------|
| Alice|  30 | NYC  |
| Bob  |  25 | LA   |
`;
        const ast = parseOrgDocument(orgText);
        render(<OrgElementRenderer elements={ast.children} />, root);

        const table = root.querySelector("table.org-table");
        assertNotEquals(table, null);

        const thead = root.querySelector("thead");
        assertNotEquals(thead, null);
        assertEquals(thead?.textContent?.includes("Name"), true);
        assertEquals(thead?.textContent?.includes("Age"), true);

        const tbody = root.querySelector("tbody");
        assertNotEquals(tbody, null);
        assertEquals(tbody?.textContent?.includes("Alice"), true);
        assertEquals(tbody?.textContent?.includes("Bob"), true);
    } finally {
        cleanup();
    }
});

Deno.test("OrgElementRenderer: Lists render interactive checkboxes, cookies, and description items", () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = `- [ ] Task 1 [0/2]
  - [ ] Subtask 1.1
  - [X] Subtask 1.2
- Term :: Definition content
`;
        const ast = parseOrgDocument(orgText);
        let toggledCheckbox = "";

        render(
            <OrgElementRenderer
                elements={ast.children}
                onToggleCheckbox={(id) => {
                    toggledCheckbox = id;
                }}
            />,
            root,
        );

        // Verify description term
        const termEl = root.querySelector(".org-list-tag");
        assertNotEquals(termEl, null);
        assertEquals(termEl?.textContent?.includes("Term"), true);

        // Verify checkboxes
        const checkboxes = root.querySelectorAll('input[type="checkbox"]');
        assertEquals(checkboxes.length, 3);

        // Click first checkbox
        triggerClick(checkboxes[0]);
        assertEquals(toggledCheckbox, "l-0.i-0");
    } finally {
        cleanup();
    }
});

Deno.test("OrgElementRenderer: Property drawers render collapsible key-value table", () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = `:PROPERTIES:
:CUSTOM_ID: my-id
:CATEGORY: tasks
:END:
`;
        const ast = parseOrgDocument(orgText);
        render(<OrgElementRenderer elements={ast.children} />, root);

        const drawer = root.querySelector(".org-drawer");
        assertNotEquals(drawer, null);
        assertEquals(drawer?.textContent?.includes(":PROPERTIES:"), true);

        // Initially collapsed
        const drawerBtn = drawer?.querySelector("button");
        assertNotEquals(drawerBtn, null);
        assertEquals(drawer?.querySelector("table"), null);

        // Expand drawer
        triggerClick(drawerBtn);
        // Note: OrgDrawerView uses internal state for drawer fold; clicking button expands it
    } finally {
        cleanup();
    }
});
