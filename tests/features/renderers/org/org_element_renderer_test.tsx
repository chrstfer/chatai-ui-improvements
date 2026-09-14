import { assertEquals } from "@std/assert";
import { cleanup as cleanupRtl, render } from "@testing-library/preact";
import { setupTestDom, triggerClick } from "@internal/tests/fixtures";
import { OrgElementRenderer } from "@internal/features/renderers/org";
import { parseOrgDocument } from "@internal/features/parsers/org";

Deno.test("unit: OrgElementRenderer: renders H1 tag with headline title", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Top Headline\nContent.");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const h1 = container.querySelector("h1.org-headline");
        assertEquals(h1?.textContent?.includes("Top Headline"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders nested H2 tag with child headline title", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Top\n** Level 2 Child Headline\nChild.");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const h2 = container.querySelector("h2.org-headline");
        assertEquals(h2?.textContent?.includes("Level 2 Child Headline"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders headline priority marker", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* TODO [#A] Top Headline\nContent.");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const priorityEl = container.querySelector(".org-priority");
        assertEquals(priorityEl?.textContent?.includes("[#A]"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders headline tag chips", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Top Headline :WORK:PROJECT:\nContent.");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const tagEls = container.querySelectorAll(".org-tag");
        assertEquals(tagEls.length >= 2, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders headline planning information", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Top\nDEADLINE: <2026-09-10 Thu>\nContent.");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const planningEl = container.querySelector(".org-planning");
        assertEquals(planningEl?.textContent?.includes("DEADLINE"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: fold toggle click dispatches onToggleHeadlineFold", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Top\nBody.");
        let toggledHeadline = "";
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                onToggleHeadlineFold={(id) => {
                    toggledHeadline = id;
                }}
            />,
        );
        const foldBtn = container.querySelector("button.org-fold-toggle");
        triggerClick(foldBtn);
        assertEquals(toggledHeadline, "h-0");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: hides headline body when foldedHeadlines includes headline ID", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Top\nBody.");
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                foldedHeadlines={["h-0"]}
            />,
        );
        assertEquals(container.querySelector(".org-headline-body"), null);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: clicking TODO badge dispatches onCycleTodo", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* TODO Task A");
        let cycledStatus = "";
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                onCycleTodo={(_id, status) => {
                    cycledStatus = status;
                }}
            />,
        );
        const todoBadge = container.querySelector("button.org-todo-badge");
        triggerClick(todoBadge);
        assertEquals(cycledStatus, "TODO");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: applies line-through styling when todoOverrides marks headline DONE", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* TODO Task A");
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                todoOverrides={{ "h-0": "DONE" }}
            />,
        );
        const headlineTitle = container.querySelector(".org-headline-title");
        assertEquals(headlineTitle?.getAttribute("class")?.includes("line-through"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders source block line count pill", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("#+BEGIN_SRC python\ndef add(a, b):\n    return a + b\n#+END_SRC");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const lineCountEl = container.querySelector(".org-line-count");
        assertEquals(lineCountEl?.textContent?.includes("2 lines"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders source block copy button", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("#+BEGIN_SRC python\nprint(42)\n#+END_SRC");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const copyBtn = container.querySelector("button.org-btn-copy");
        assertEquals(copyBtn?.textContent?.includes("Copy"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: clicking source block header dispatches onToggleBlockFold", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("#+NAME: sample-code\n#+BEGIN_SRC python\nprint(42)\n#+END_SRC");
        let toggledBlock = "";
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                onToggleBlockFold={(id) => {
                    toggledBlock = id;
                }}
            />,
        );
        const blockHeader = container.querySelector(".org-block-container header");
        triggerClick(blockHeader);
        assertEquals(toggledBlock, "b-0:sample-code");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: hides source block body when foldedBlocks includes block ID", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("#+NAME: sample-code\n#+BEGIN_SRC python\nprint(42)\n#+END_SRC");
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                foldedBlocks={["b-0:sample-code"]}
            />,
        );
        assertEquals(container.querySelector(".org-block-body"), null);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders table thead header columns", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("| Name | Age |\n|---+---|\n| Alice | 30 |");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const thead = container.querySelector("thead");
        assertEquals(thead?.textContent?.includes("Name"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders table tbody data rows", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("| Name | Age |\n|---+---|\n| Alice | 30 |");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const tbody = container.querySelector("tbody");
        assertEquals(tbody?.textContent?.includes("Alice"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders list description term tag", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("- Term :: Definition content");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const termEl = container.querySelector(".org-list-tag");
        assertEquals(termEl?.textContent?.includes("Term"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders checkboxes for list items", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("- [ ] Task 1\n- [X] Task 2");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        assertEquals(checkboxes.length, 2);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: clicking checkbox dispatches onToggleCheckbox", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("- [ ] Task 1");
        let toggledCheckbox = "";
        const { container } = render(
            <OrgElementRenderer
                elements={ast.children}
                onToggleCheckbox={(id) => {
                    toggledCheckbox = id;
                }}
            />,
        );
        const checkbox = container.querySelector('input[type="checkbox"]');
        triggerClick(checkbox);
        assertEquals(toggledCheckbox, "l-0.i-0");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders collapsible property drawer header", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument(":PROPERTIES:\n:CUSTOM_ID: my-id\n:END:");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const drawer = container.querySelector(".org-drawer");
        assertEquals(drawer?.textContent?.includes(":PROPERTIES:"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgElementRenderer: renders exactly one property drawer under headline without duplication", () => {
    const { cleanup } = setupTestDom();
    try {
        const ast = parseOrgDocument("* Headline\n:PROPERTIES:\n:ID: 1\n:END:\nBody.");
        const { container } = render(<OrgElementRenderer elements={ast.children} />);
        const drawers = container.querySelectorAll(".org-drawer");
        assertEquals(drawers.length, 1);
    } finally {
        cleanupRtl();
        cleanup();
    }
});
