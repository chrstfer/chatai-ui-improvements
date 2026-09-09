import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { CodeBlockHeader, InSituCodeBlockContainer, RawSourceView } from "../src/views/codeblock/index.ts";
import { ViewStateCache } from "../src/store/viewStateCache.ts";
import { computeContentHash } from "../src/core/utils/contentHash.ts";

function triggerClick(el: unknown) {
    const origTarget = el as Node;
    let curr = el as (Node & { dispatchEvent?: (e: Event) => boolean; parentNode?: Node | null }) | null;
    const ev = new Event("click", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "target", {
        get: () => origTarget,
        configurable: true,
    });
    while (curr) {
        if (typeof curr.dispatchEvent === "function") {
            curr.dispatchEvent(ev);
        }
        if ((ev as unknown as { cancelBubble?: boolean }).cancelBubble) {
            break;
        }
        curr = curr.parentNode as typeof curr;
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

    // deno-dom does not implement SVG createElementNS; shim it to createElement for tests
    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => {
        return doc.createElement(tag);
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

Deno.test("RawSourceView renders pre and code tags with data-language attribute", () => {
    const { root, cleanup } = setupDom();
    try {
        render(<RawSourceView rawText="print('hello world')" language="python" />, root);

        const codeEl = root.querySelector("pre.ext-raw-code code");
        assertNotEquals(codeEl, null);
        assertEquals(codeEl?.textContent, "print('hello world')");
        assertEquals(codeEl?.getAttribute("data-language"), "python");
    } finally {
        cleanup();
    }
});

Deno.test("CodeBlockHeader formats language badge and respects hasRenderedView visibility", () => {
    const { root, cleanup } = setupDom();
    try {
        let foldClicked = false;
        let viewToggleClicked = false;
        let copyClicked = false;

        // 1. With hasRenderedView = false
        render(
            <CodeBlockHeader
                language="python"
                isFolded={false}
                viewMode="raw"
                hasRenderedView={false}
                isCopied={false}
                onToggleFold={() => {
                    foldClicked = true;
                }}
                onToggleViewMode={() => {
                    viewToggleClicked = true;
                }}
                onCopy={() => {
                    copyClicked = true;
                }}
            />,
            root,
        );

        const badge = root.querySelector(".ext-language-badge");
        assertEquals(badge?.textContent?.trim(), "PYTHON");

        // View toggle button should NOT be rendered
        const viewToggleBtn = root.querySelector(".ext-btn-view-toggle");
        assertEquals(viewToggleBtn, null);

        // Fold and copy buttons should be present
        const foldBtn = root.querySelector(".ext-btn-fold");
        assertNotEquals(foldBtn, null);
        triggerClick(foldBtn);
        assertEquals(foldClicked, true);

        const copyBtn = root.querySelector(".ext-btn-copy");
        assertNotEquals(copyBtn, null);
        assertEquals(copyBtn?.textContent?.includes("Copy"), true);
        triggerClick(copyBtn);
        assertEquals(copyClicked, true);

        // 2. With hasRenderedView = true, language = "org", and isCopied = true
        render(
            <CodeBlockHeader
                language="org"
                isFolded
                viewMode="rendered"
                hasRenderedView
                isCopied
                onToggleFold={() => {}}
                onToggleViewMode={() => {
                    viewToggleClicked = true;
                }}
                onCopy={() => {}}
            />,
            root,
        );

        const orgBadge = root.querySelector(".ext-language-badge");
        assertEquals(orgBadge?.textContent?.trim(), "ORG MODE");

        const renderedViewBtn = root.querySelector(".ext-btn-view-toggle");
        assertNotEquals(renderedViewBtn, null);
        assertEquals(renderedViewBtn?.textContent?.includes("Raw"), true);
        triggerClick(renderedViewBtn);
        assertEquals(viewToggleClicked, true);

        const copiedBtn = root.querySelector(".ext-btn-copy");
        assertEquals(copiedBtn?.textContent?.includes("Copied!"), true);
    } finally {
        cleanup();
    }
});

Deno.test("CodeBlockHeader allows clicking anywhere on the header to toggle fold across the bar", () => {
    const { root, cleanup } = setupDom();
    try {
        let foldCount = 0;
        let copyCount = 0;

        render(
            <CodeBlockHeader
                language="python"
                isFolded={false}
                viewMode="raw"
                hasRenderedView={false}
                isCopied={false}
                onToggleFold={() => {
                    foldCount++;
                }}
                onToggleViewMode={() => {}}
                onCopy={() => {
                    copyCount++;
                }}
            />,
            root,
        );

        const header = root.querySelector("header.ext-header");
        assertNotEquals(header, null);

        // 1. Clicking directly on the header background triggers fold
        triggerClick(header);
        assertEquals(foldCount, 1, "Clicking header bar should trigger fold");

        // 2. Clicking the language badge inside header triggers fold
        const badge = root.querySelector(".ext-language-badge");
        assertNotEquals(badge, null);
        triggerClick(badge);
        assertEquals(foldCount, 2, "Clicking language badge inside header should trigger fold");

        // 3. Clicking the fold icon button triggers fold exactly once
        const foldBtn = root.querySelector(".ext-btn-fold");
        assertNotEquals(foldBtn, null);
        triggerClick(foldBtn);
        assertEquals(foldCount, 3, "Clicking fold button should trigger fold");

        // 4. Clicking the copy button does NOT trigger fold
        const copyBtn = root.querySelector(".ext-btn-copy");
        assertNotEquals(copyBtn, null);
        triggerClick(copyBtn);
        assertEquals(foldCount, 3, "Clicking copy button must not trigger fold");
        assertEquals(copyCount, 1, "Copy action should fire");
    } finally {
        cleanup();
    }
});

Deno.test("InSituCodeBlockContainer renders body, toggles fold, and synchronizes with ViewStateCache", async () => {
    const { root, cleanup } = setupDom();
    const cache = new ViewStateCache(10);
    const rawText = "* Headline 1\n** Subheadline";
    const language = "org";
    const hash = computeContentHash(rawText, language);

    try {
        render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={language}
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
            root,
        );

        // Allow useEffect to persist initial view state to cache
        await new Promise((resolve) => setTimeout(resolve, 80));

        // Initially viewMode is "rendered" and not folded
        const renderedEl = root.querySelector(".test-rendered-content");
        assertNotEquals(renderedEl, null);
        assertEquals(renderedEl?.textContent, "Rendered Document Content");

        // Cached state should be populated
        const state1 = cache.get(hash);
        assertEquals(state1?.isFolded, false);
        assertEquals(state1?.viewMode, "rendered");

        // 1. First cycle on rendered view switches to raw view
        const foldBtn = root.querySelector(".ext-btn-fold");
        triggerClick(foldBtn);
        await new Promise((resolve) => setTimeout(resolve, 50));

        const rawEl = root.querySelector("code[data-language='org']");
        assertNotEquals(rawEl, null, "First cycle should switch from rendered to raw view");
        assertEquals(cache.get(hash)?.viewMode, "raw");
        assertEquals(cache.get(hash)?.isFolded, false);

        // 2. Second cycle from raw view collapses the block
        triggerClick(foldBtn);
        await new Promise((resolve) => setTimeout(resolve, 50));

        assertEquals(root.querySelector(".ext-codeblock-body"), null, "Second cycle should fold block body");
        assertEquals(cache.get(hash)?.isFolded, true);

        // 3. Third cycle from collapsed expands back to rendered view
        triggerClick(foldBtn);
        await new Promise((resolve) => setTimeout(resolve, 50));

        assertNotEquals(
            root.querySelector(".test-rendered-content"),
            null,
            "Third cycle should expand to rendered view",
        );
        assertEquals(cache.get(hash)?.isFolded, false);
        assertEquals(cache.get(hash)?.viewMode, "rendered");
    } finally {
        cleanup();
    }
});

Deno.test("InSituCodeBlockContainer hydrates previous view state from ViewStateCache", () => {
    const { root, cleanup } = setupDom();
    const cache = new ViewStateCache(10);
    const rawText = "def calculate(): return 42";
    const language = "python";
    const hash = computeContentHash(rawText, language);

    // Pre-populate cache with folded state
    cache.set(hash, { isFolded: true, viewMode: "raw" });

    try {
        render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={language}
                hasRenderedView={false}
                cache={cache}
            />,
            root,
        );

        // Body should be folded immediately on mount
        const bodyEl = root.querySelector(".ext-codeblock-body");
        assertEquals(bodyEl, null);

        const containerEl = root.querySelector(".ext-codeblock-container");
        assertEquals(containerEl?.getAttribute("class")?.includes("is-folded"), true);
    } finally {
        cleanup();
    }
});

Deno.test("InSituCodeBlockContainer copy button triggers clipboard write and visual feedback", async () => {
    const { root, cleanup } = setupDom();
    let written = "";
    const origClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: (text: string) => {
                    written = text;
                    return Promise.resolve();
                },
            },
            configurable: true,
            writable: true,
        });

        render(
            <InSituCodeBlockContainer
                rawText="let x = 100;"
                language="typescript"
            />,
            root,
        );

        const copyBtn = root.querySelector(".ext-btn-copy");
        assertNotEquals(copyBtn, null);
        assertEquals(copyBtn?.textContent?.includes("Copy"), true);

        triggerClick(copyBtn);

        // Allow microtasks & async clipboard promise to resolve
        await new Promise((resolve) => setTimeout(resolve, 80));

        assertEquals(written, "let x = 100;");
        assertEquals(copyBtn?.textContent?.includes("Copied!"), true);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: origClipboard,
            configurable: true,
            writable: true,
        });
        cleanup();
    }
});

Deno.test("CodeBlockViewDispatcher loads language view and mounts inside InSituCodeBlockContainer", async () => {
    const { root, cleanup } = setupDom();
    try {
        const orgText = "* Live Org Headline\nProse content.";
        render(
            <InSituCodeBlockContainer
                rawText={orgText}
                language="org"
                hasRenderedView
            />,
            root,
        );

        // Allow lazy loader and Preact rerender
        await new Promise((resolve) => setTimeout(resolve, 80));

        // Rich Org Document view should be rendered
        const orgDoc = root.querySelector(".org-document-view");
        assertNotEquals(orgDoc, null);

        const headline = root.querySelector("h1.org-headline");
        assertNotEquals(headline, null);
        assertEquals(headline?.textContent?.includes("Live Org Headline"), true);
    } finally {
        cleanup();
    }
});
