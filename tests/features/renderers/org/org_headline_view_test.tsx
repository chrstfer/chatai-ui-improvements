import { assertEquals } from "@std/assert";
import { cleanup as cleanupRtl, render } from "@testing-library/preact";
import { setupTestDom, triggerClick } from "@internal/tests/fixtures";
import { OrgHeadlineView } from "../../../../src/features/renderers/org/OrgHeadlineView.tsx";
import type { OrgHeadlineElement } from "@internal/features/parsers/org";

function mockClipboard(): { getText: () => string; restore: () => void } {
    let clipboardText = "";
    const origClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;
    Object.defineProperty(navigator, "clipboard", {
        value: {
            writeText: (text: string) => {
                clipboardText = text;
                return Promise.resolve();
            },
        },
        configurable: true,
    });
    return {
        getText: () => clipboardText,
        restore: () => {
            // @ts-ignore cleanup mock
            delete (navigator as { clipboard?: unknown }).clipboard;
            if (origClipboard) {
                Object.defineProperty(navigator, "clipboard", { value: origClipboard, configurable: true });
            }
        },
    };
}

Deno.test("unit: OrgHeadlineView: applies compact boxed card styling to H1", () => {
    const { cleanup } = setupTestDom();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Level 1 Title" }],
            tags: [],
            children: [],
        };
        const { container } = render(<OrgHeadlineView headline={headline} headlinePath="h-0" />);
        const h1 = container.querySelector("h1.org-headline");
        assertEquals(h1?.className.includes("cursor-pointer"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: row click invokes onToggleFold callback", () => {
    const { cleanup } = setupTestDom();
    try {
        let toggledId: string | null = null;
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 2,
            title: [{ type: "text", value: "Level 2 Title" }],
            tags: [],
            children: [],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-1"
                onToggleFold={(id) => {
                    toggledId = id;
                }}
            />,
        );
        const h2 = container.querySelector("h2.org-headline");
        triggerClick(h2);
        assertEquals(toggledId, "h-1");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: clicking TODO badge triggers onCycleTodo", () => {
    const { cleanup } = setupTestDom();
    try {
        let cycledStatus: string | null = null;
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            todoKeyword: "TODO",
            title: [{ type: "text", value: "Interactive Heading" }],
            tags: ["feature"],
            children: [],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
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

Deno.test("unit: OrgHeadlineView: clicking TODO badge prevents row fold toggle", () => {
    const { cleanup } = setupTestDom();
    try {
        let foldCount = 0;
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            todoKeyword: "TODO",
            title: [{ type: "text", value: "Interactive Heading" }],
            tags: ["feature"],
            children: [],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
                onToggleFold={() => {
                    foldCount++;
                }}
            />,
        );
        const todoBadge = container.querySelector("button.org-todo-badge");
        triggerClick(todoBadge);
        assertEquals(foldCount, 0);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: clicking copy button prevents row fold toggle", () => {
    const { cleanup } = setupTestDom();
    try {
        let foldCount = 0;
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Task Heading" }],
            tags: [],
            children: [],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
                onToggleFold={() => {
                    foldCount++;
                }}
            />,
        );
        const copyBtn = container.querySelector("button.org-subtree-copy-btn");
        triggerClick(copyBtn);
        assertEquals(foldCount, 0);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: subtree copy button writes serialized Org subtree to clipboard", async () => {
    const { cleanup } = setupTestDom();
    const clip = mockClipboard();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            todoKeyword: "TODO",
            priority: "A",
            title: [{ type: "text", value: "Pipeline Automation" }],
            tags: ["dev", "ci"],
            children: [
                {
                    type: "paragraph",
                    children: [{ type: "text", value: "Paragraph content in subtree." }],
                },
            ],
        };
        const { container } = render(<OrgHeadlineView headline={headline} headlinePath="h-0" />);
        const copyBtn = container.querySelector("button.org-subtree-copy-btn");
        triggerClick(copyBtn);
        await new Promise((resolve) => setTimeout(resolve, 15));
        assertEquals(clip.getText().includes("* TODO [#A] Pipeline Automation :dev:ci:"), true);
    } finally {
        clip.restore();
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: subtree copy button displays copied confirmation feedback", async () => {
    const { cleanup } = setupTestDom();
    const clip = mockClipboard();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Heading" }],
            tags: [],
            children: [],
        };
        const { container } = render(<OrgHeadlineView headline={headline} headlinePath="h-0" />);
        const copyBtn = container.querySelector("button.org-subtree-copy-btn");
        triggerClick(copyBtn);
        await new Promise((resolve) => setTimeout(resolve, 15));
        assertEquals(copyBtn?.textContent?.includes("Copied!"), true);
    } finally {
        clip.restore();
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: displays right-arrow and hides body in folded state", () => {
    const { cleanup } = setupTestDom();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Parent Topic" }],
            tags: [],
            children: [
                { type: "paragraph", children: [{ type: "text", value: "Content" }] },
            ],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
                foldState="folded"
            />,
        );
        const foldToggle = container.querySelector(".org-fold-toggle");
        assertEquals(foldToggle?.textContent?.trim(), "▶");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: renders child headline while hiding parent paragraph in children state", () => {
    const { cleanup } = setupTestDom();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Parent Topic" }],
            tags: [],
            children: [
                { type: "paragraph", children: [{ type: "text", value: "Parent paragraph" }] },
                { type: "headline", level: 2, title: [{ type: "text", value: "Nested" }], tags: [], children: [] },
            ],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
                foldState="children"
                renderElement={(elem, _idx, path) => (
                    <div class={`child-${elem.type}`} data-path={path}>
                        {elem.type}
                    </div>
                )}
            />,
        );
        assertEquals(container.querySelector(".child-paragraph"), null);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgHeadlineView: renders both paragraph and child headline in subtree state", () => {
    const { cleanup } = setupTestDom();
    try {
        const headline: OrgHeadlineElement = {
            type: "headline",
            level: 1,
            title: [{ type: "text", value: "Parent Topic" }],
            tags: [],
            children: [
                { type: "paragraph", children: [{ type: "text", value: "Parent paragraph" }] },
                { type: "headline", level: 2, title: [{ type: "text", value: "Nested" }], tags: [], children: [] },
            ],
        };
        const { container } = render(
            <OrgHeadlineView
                headline={headline}
                headlinePath="h-0"
                foldState="subtree"
                renderElement={(elem, _idx, path) => (
                    <div class={`child-${elem.type}`} data-path={path}>
                        {elem.type}
                    </div>
                )}
            />,
        );
        assertEquals(container.querySelector(".child-paragraph") !== null, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});
