import { assertEquals } from "@std/assert";
import { cleanup as cleanupRtl, render } from "@testing-library/preact";
import { setupTestDom, triggerClick } from "../../fixtures/dom_fixture.ts";
import { OrgDocumentView } from "../../../src/languages/org/views/OrgDocumentView.tsx";
import { defaultAstCache } from "../../../src/store/astCache.ts";
import { computeContentHash } from "../../../src/core/utils/contentHash.ts";

Deno.test("unit: OrgDocumentView renders document title in header", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "#+TITLE: Main Knowledge Base\n* First Headline\nContent.\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const h1 = container.querySelector("header h1");
        assertEquals(h1?.textContent?.trim(), "Main Knowledge Base");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView caches parsed AST in defaultAstCache", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "#+TITLE: Main Knowledge Base\n* First Headline\nContent.\n";
        const hash = computeContentHash(content, "org");
        defaultAstCache.delete(hash, "org");
        render(<OrgDocumentView content={content} language="org" />);
        const cachedAst = defaultAstCache.get(hash, "org");
        assertEquals(cachedAst !== undefined, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView initializes headlines in folded state when STARTUP overview is present", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "#+STARTUP: overview\n* Section One\nContent.\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const bodies = container.querySelectorAll(".org-headline-body");
        assertEquals(bodies.length, 0);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView fold toggles display folded glyph in overview mode", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "#+STARTUP: overview\n* Section One\nContent.\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const foldBtn = container.querySelector("button.org-fold-toggle");
        assertEquals(foldBtn?.textContent?.includes("▶"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView hydrates folded headlines from documentViewState", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* Section One\nBody text.\n";
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                documentViewState={{ foldedHeadlines: ["h-0"] }}
            />,
        );
        assertEquals(container.querySelector(".org-headline-body"), null);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView hydrates TODO overrides from documentViewState", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* TODO Section One\nBody text.\n";
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                documentViewState={{ todoOverrides: { "h-0": "DONE" } }}
            />,
        );
        const badge = container.querySelector("button.org-todo-badge");
        assertEquals(badge?.textContent?.trim(), "DONE");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView dispatches updated foldedHeadlines on fold toggle", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* Section One\nBody text.\n";
        let lastState: unknown = null;
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                documentViewState={{ foldedHeadlines: ["h-0"] }}
                onSaveViewState={(s) => {
                    lastState = s;
                }}
            />,
        );
        const foldBtn = container.querySelector("button.org-fold-toggle");
        triggerClick(foldBtn);
        await new Promise((r) => setTimeout(r, 20));
        const state = lastState as { foldedHeadlines: string[] } | null;
        assertEquals(state?.foldedHeadlines?.includes("h-0"), false);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView dispatches updated todoOverrides on TODO cycle", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* TODO Section One\nBody text.\n";
        let lastState: unknown = null;
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                onSaveViewState={(s) => {
                    lastState = s;
                }}
            />,
        );
        const todoBadge = container.querySelector("button.org-todo-badge");
        triggerClick(todoBadge);
        await new Promise((r) => setTimeout(r, 20));
        const state = lastState as { todoOverrides: Record<string, string> } | null;
        assertEquals(state?.todoOverrides?.["h-0"], "NEXT");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView dispatches updated foldedBlocks on block toggle", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "#+NAME: sample-block\n#+BEGIN_SRC python\nx = 1\n#+END_SRC\n";
        let lastState: unknown = null;
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                onSaveViewState={(s) => {
                    lastState = s;
                }}
            />,
        );
        const blockHeader = container.querySelector(".org-block-container header");
        triggerClick(blockHeader);
        await new Promise((r) => setTimeout(r, 20));
        const state = lastState as { foldedBlocks: string[] } | null;
        assertEquals(state?.foldedBlocks?.some((b) => b.includes("sample-block")), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView dispatches updated checkedItems on checkbox click", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "- [ ] Task item\n";
        let lastState: unknown = null;
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                onSaveViewState={(s) => {
                    lastState = s;
                }}
            />,
        );
        const checkbox = container.querySelector('input[type="checkbox"]');
        triggerClick(checkbox);
        await new Promise((r) => setTimeout(r, 20));
        const state = lastState as { checkedItems: string[] } | null;
        assertEquals(state?.checkedItems?.some((i) => i.includes("i-0")), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView renders internal link button", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* Target\nLink to [[*Target][Go to Target]].\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const link = container.querySelector("button.org-internal-link");
        assertEquals(link?.textContent?.trim(), "Go to Target");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView renders target headline section matching internal link", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* Target\nLink to [[*Target][Go to Target]].\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const target = container.querySelector('[data-headline-title="Target"]');
        assertEquals(target !== null, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView clicking internal link executes without throwing", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* Target\nLink to [[*Target][Go to Target]].\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const link = container.querySelector("button.org-internal-link");
        triggerClick(link);
        assertEquals(true, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView initial render in default state shows all headline levels", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* H1\nText 1\n** H2\nText 2\n*** H3\nText 3\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const headlines = container.querySelectorAll(".org-headline");
        assertEquals(headlines.length, 3);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView clicking headline cycles to folded state hiding child headlines", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* H1\nText 1\n** H2\nText 2\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const h1Section = container.querySelector('[data-headline-title="H1"]');
        const h1Header = h1Section?.querySelector(".org-headline");
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        assertEquals(container.querySelectorAll(".org-headline").length, 1);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView cycling to children state shows intermediate child headlines", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* H1\nText 1\n** H2\nText 2\n*** H3\nText 3\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const h1Section = container.querySelector('[data-headline-title="H1"]');
        const h1Header = h1Section?.querySelector(".org-headline");
        // 1st click: folded
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        // 2nd click: children
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        const h2Section = container.querySelector('[data-headline-title="H2"]');
        assertEquals(h2Section !== null, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView cycling to children state hides headline body text", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* H1\nUniqueBodyTextH1\n** H2\nText 2\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const h1Section = container.querySelector('[data-headline-title="H1"]');
        const h1Header = h1Section?.querySelector(".org-headline");
        // 1st click: folded
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        // 2nd click: children
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        assertEquals(container.textContent?.includes("UniqueBodyTextH1"), false);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView cycling to subtree state reveals all descendants", async () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* H1\nText 1\n** H2\nText 2\n*** H3\nText 3\n";
        const { container } = render(<OrgDocumentView content={content} language="org" />);
        const h1Section = container.querySelector('[data-headline-title="H1"]');
        const h1Header = h1Section?.querySelector(".org-headline");
        // 1st click: folded
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        // 2nd click: children
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        // 3rd click: subtree
        triggerClick(h1Header);
        await new Promise((r) => setTimeout(r, 20));
        assertEquals(container.querySelectorAll(".org-headline").length, 3);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgDocumentView rootFoldState children initializes top-level headlines to folded", () => {
    const { cleanup } = setupTestDom();
    try {
        const content = "* H1 Alpha\nAlpha text.\n** H2 Beta\nBeta text.\n";
        const { container } = render(
            <OrgDocumentView
                content={content}
                language="org"
                documentViewState={{ rootFoldState: "children" }}
            />,
        );
        const h1 = container.querySelector('[data-headline-title="H1 Alpha"]');
        const foldToggle = h1?.querySelector(".org-fold-toggle");
        assertEquals(foldToggle?.textContent?.trim(), "▶");
    } finally {
        cleanupRtl();
        cleanup();
    }
});
