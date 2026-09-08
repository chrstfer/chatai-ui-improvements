import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { CodeBlockHeader, InSituCodeBlockContainer, RawSourceView } from "../src/views/codeblock/index.ts";
import { ViewStateCache } from "../src/store/viewStateCache.ts";
import { computeContentHash } from "../src/core/utils/contentHash.ts";

function triggerClick(el: unknown) {
    if (el && typeof (el as { dispatchEvent?: unknown }).dispatchEvent === "function") {
        (el as { dispatchEvent: (ev: Event) => void }).dispatchEvent(
            new Event("click", { bubbles: true }),
        );
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

        // Fold toggle
        const foldBtn = root.querySelector(".ext-btn-fold");
        triggerClick(foldBtn);

        // Allow rerender & effect update
        await new Promise((resolve) => setTimeout(resolve, 80));

        // After fold, body should be unmounted
        const bodyEl = root.querySelector(".ext-codeblock-body");
        assertEquals(bodyEl, null);

        // Header remains visible
        const headerEl = root.querySelector(".ext-header");
        assertNotEquals(headerEl, null);

        // Cache reflects folded state
        const state2 = cache.get(hash);
        assertEquals(state2?.isFolded, true);
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
