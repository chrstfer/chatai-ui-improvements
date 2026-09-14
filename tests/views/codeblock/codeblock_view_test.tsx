import { assertEquals, assertNotEquals } from "@std/assert";
import { cleanup, render } from "@testing-library/preact";
import { setupTestDom, triggerClick } from "../../fixtures/dom_fixture.ts";
import { CodeBlockHeader, InSituCodeBlockContainer, RawSourceView } from "../../../src/views/codeblock/index.ts";
import { ViewStateCache } from "../../../src/store/viewStateCache.ts";
import { computeContentHash } from "../../../src/core/utils/contentHash.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.test("unit: RawSourceView renders code element within pre container", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <RawSourceView rawText="print('hello world')" language="python" />,
        );
        const codeEl = container.querySelector("pre.ext-raw-code code");
        assertNotEquals(codeEl, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: RawSourceView sets code element text content", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <RawSourceView rawText="print('hello world')" language="python" />,
        );
        const codeEl = container.querySelector("pre.ext-raw-code code");
        assertEquals(codeEl?.textContent, "print('hello world')");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: RawSourceView sets data-language attribute on code element", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <RawSourceView rawText="print('hello world')" language="python" />,
        );
        const codeEl = container.querySelector("pre.ext-raw-code code");
        assertEquals(codeEl?.getAttribute("data-language"), "python");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader formats language badge text in uppercase", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <CodeBlockHeader
                language="python"
                isFolded={false}
                viewMode="raw"
                hasRenderedView={false}
                isCopied={false}
                onToggleFold={() => {}}
                onToggleViewMode={() => {}}
                onCopy={() => {}}
            />,
        );
        const badge = container.querySelector(".ext-language-badge");
        assertEquals(badge?.textContent?.trim(), "PYTHON");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader hides view toggle button when hasRenderedView is false", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <CodeBlockHeader
                language="python"
                isFolded={false}
                viewMode="raw"
                hasRenderedView={false}
                isCopied={false}
                onToggleFold={() => {}}
                onToggleViewMode={() => {}}
                onCopy={() => {}}
            />,
        );
        assertEquals(container.querySelector(".ext-btn-view-toggle"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader triggers onToggleFold when fold button clicked", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let foldClicked = false;
        const { container } = render(
            <CodeBlockHeader
                language="python"
                isFolded={false}
                viewMode="raw"
                hasRenderedView={false}
                isCopied={false}
                onToggleFold={() => {
                    foldClicked = true;
                }}
                onToggleViewMode={() => {}}
                onCopy={() => {}}
            />,
        );
        const foldBtn = container.querySelector(".ext-btn-fold");
        triggerClick(foldBtn);
        assertEquals(foldClicked, true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader triggers onCopy when copy button clicked", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let copyClicked = false;
        const { container } = render(
            <CodeBlockHeader
                language="python"
                isFolded={false}
                viewMode="raw"
                hasRenderedView={false}
                isCopied={false}
                onToggleFold={() => {}}
                onToggleViewMode={() => {}}
                onCopy={() => {
                    copyClicked = true;
                }}
            />,
        );
        const copyBtn = container.querySelector(".ext-btn-copy");
        triggerClick(copyBtn);
        assertEquals(copyClicked, true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader formats org language badge as ORG MODE", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <CodeBlockHeader
                language="org"
                isFolded
                viewMode="rendered"
                hasRenderedView
                isCopied={false}
                onToggleFold={() => {}}
                onToggleViewMode={() => {}}
                onCopy={() => {}}
            />,
        );
        const orgBadge = container.querySelector(".ext-language-badge");
        assertEquals(orgBadge?.textContent?.trim(), "ORG MODE");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader renders view toggle button when hasRenderedView is true", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <CodeBlockHeader
                language="org"
                isFolded
                viewMode="rendered"
                hasRenderedView
                isCopied={false}
                onToggleFold={() => {}}
                onToggleViewMode={() => {}}
                onCopy={() => {}}
            />,
        );
        const renderedViewBtn = container.querySelector(".ext-btn-view-toggle");
        assertNotEquals(renderedViewBtn, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader triggers onToggleViewMode when view toggle button clicked", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let viewToggleClicked = false;
        const { container } = render(
            <CodeBlockHeader
                language="org"
                isFolded
                viewMode="rendered"
                hasRenderedView
                isCopied={false}
                onToggleFold={() => {}}
                onToggleViewMode={() => {
                    viewToggleClicked = true;
                }}
                onCopy={() => {}}
            />,
        );
        const renderedViewBtn = container.querySelector(".ext-btn-view-toggle");
        triggerClick(renderedViewBtn);
        assertEquals(viewToggleClicked, true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader displays Copied! label when isCopied is true", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <CodeBlockHeader
                language="org"
                isFolded
                viewMode="rendered"
                hasRenderedView
                isCopied
                onToggleFold={() => {}}
                onToggleViewMode={() => {}}
                onCopy={() => {}}
            />,
        );
        const copiedBtn = container.querySelector(".ext-btn-copy");
        assertEquals(copiedBtn?.textContent?.includes("Copied!"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader toggles fold when clicking header bar background", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let foldCount = 0;
        const { container } = render(
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
                onCopy={() => {}}
            />,
        );
        const header = container.querySelector("header.ext-header");
        triggerClick(header);
        assertEquals(foldCount, 1);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader toggles fold when clicking language badge", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let foldCount = 0;
        const { container } = render(
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
                onCopy={() => {}}
            />,
        );
        const badge = container.querySelector(".ext-language-badge");
        triggerClick(badge);
        assertEquals(foldCount, 1);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader toggles fold when clicking fold icon button", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let foldCount = 0;
        const { container } = render(
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
                onCopy={() => {}}
            />,
        );
        const foldBtn = container.querySelector(".ext-btn-fold");
        triggerClick(foldBtn);
        assertEquals(foldCount, 1);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: CodeBlockHeader does not toggle fold when clicking copy button", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        let foldCount = 0;
        const { container } = render(
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
                onCopy={() => {}}
            />,
        );
        const copyBtn = container.querySelector(".ext-btn-copy");
        triggerClick(copyBtn);
        assertEquals(foldCount, 0);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer renders child rendered content initially", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Headline 1\n** Subheadline"
                language="org"
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const renderedEl = container.querySelector(".test-rendered-content");
        assertEquals(renderedEl?.textContent, "Rendered Document Content");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer caches initial unfolded view state", async () => {
    const { cleanup: domCleanup } = setupTestDom();
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
        );
        await sleep(80);
        const state = cache.get(hash);
        assertEquals(state?.isFolded, false);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer first fold cycle collapses block body", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Headline 1\n** Subheadline"
                language="org"
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const foldBtn = container.querySelector(".ext-btn-fold");
        triggerClick(foldBtn);
        await sleep(50);
        assertEquals(container.querySelector(".ext-codeblock-body"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer first fold cycle updates cache to folded", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    const rawText = "* Headline 1\n** Subheadline";
    const language = "org";
    const hash = computeContentHash(rawText, language);

    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={language}
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const foldBtn = container.querySelector(".ext-btn-fold");
        triggerClick(foldBtn);
        await sleep(50);
        assertEquals(cache.get(hash)?.isFolded, true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer second fold cycle expands body to children mode", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Headline 1\n** Subheadline"
                language="org"
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const foldBtn = container.querySelector(".ext-btn-fold");
        triggerClick(foldBtn); // 1st: folded
        await sleep(50);
        triggerClick(foldBtn); // 2nd: children
        await sleep(50);
        assertNotEquals(container.querySelector(".ext-codeblock-body"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer third fold cycle expands body to subtree mode", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Headline 1\n** Subheadline"
                language="org"
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const foldBtn = container.querySelector(".ext-btn-fold");
        triggerClick(foldBtn); // 1st: folded
        await sleep(50);
        triggerClick(foldBtn); // 2nd: children
        await sleep(50);
        triggerClick(foldBtn); // 3rd: subtree
        await sleep(50);
        assertNotEquals(container.querySelector(".ext-codeblock-body"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer view toggle switches to raw code view", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Headline 1\n** Subheadline"
                language="org"
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const viewToggleBtn = container.querySelector(".ext-btn-view-toggle");
        triggerClick(viewToggleBtn);
        await sleep(50);
        assertNotEquals(container.querySelector("code[data-language='org']"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer collapse bypass button directly folds body", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Headline 1\n** Subheadline"
                language="org"
                hasRenderedView
                cache={cache}
            >
                <div class="test-rendered-content">Rendered Document Content</div>
            </InSituCodeBlockContainer>,
        );
        await sleep(50);
        const collapseBtn = container.querySelector(".ext-btn-collapse");
        triggerClick(collapseBtn);
        await sleep(50);
        assertEquals(container.querySelector(".ext-codeblock-body"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer hydrates folded state from ViewStateCache on mount", () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    const rawText = "def calculate(): return 42";
    const language = "python";
    const hash = computeContentHash(rawText, language);
    cache.set(hash, { isFolded: true, viewMode: "raw" });

    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={language}
                hasRenderedView={false}
                cache={cache}
            />,
        );
        assertEquals(container.querySelector(".ext-codeblock-body"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer adds is-folded class when hydrated as folded", () => {
    const { cleanup: domCleanup } = setupTestDom();
    const cache = new ViewStateCache(10);
    const rawText = "def calculate(): return 42";
    const language = "python";
    const hash = computeContentHash(rawText, language);
    cache.set(hash, { isFolded: true, viewMode: "raw" });

    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={language}
                hasRenderedView={false}
                cache={cache}
            />,
        );
        const containerEl = container.querySelector(".ext-codeblock-container");
        assertEquals(containerEl?.getAttribute("class")?.includes("is-folded"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer writes raw text to clipboard on copy", async () => {
    const { cleanup: domCleanup } = setupTestDom();
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

        const { container } = render(
            <InSituCodeBlockContainer
                rawText="let x = 100;"
                language="typescript"
            />,
        );
        const copyBtn = container.querySelector(".ext-btn-copy");
        triggerClick(copyBtn);
        await sleep(80);
        assertEquals(written, "let x = 100;");
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: origClipboard,
            configurable: true,
            writable: true,
        });
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InSituCodeBlockContainer displays Copied! feedback after copying", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    const origClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: () => Promise.resolve(),
            },
            configurable: true,
            writable: true,
        });

        const { container } = render(
            <InSituCodeBlockContainer
                rawText="let x = 100;"
                language="typescript"
            />,
        );
        const copyBtn = container.querySelector(".ext-btn-copy");
        triggerClick(copyBtn);
        await sleep(80);
        assertEquals(copyBtn?.textContent?.includes("Copied!"), true);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: origClipboard,
            configurable: true,
            writable: true,
        });
        cleanup();
        domCleanup();
    }
});

Deno.test("integration: CodeBlockViewDispatcher mounts rich Org document view for org language", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Live Org Headline\nProse content."
                language="org"
                hasRenderedView
            />,
        );
        await sleep(80);
        const orgDoc = container.querySelector(".org-document-view");
        assertNotEquals(orgDoc, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("integration: CodeBlockViewDispatcher renders headline inside mounted document", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InSituCodeBlockContainer
                rawText="* Live Org Headline\nProse content."
                language="org"
                hasRenderedView
            />,
        );
        await sleep(80);
        const headline = container.querySelector("h1.org-headline");
        assertEquals(headline?.textContent?.includes("Live Org Headline"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});
