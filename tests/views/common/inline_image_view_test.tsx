import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { InlineImageView } from "../../../src/views/common/InlineImageView.tsx";

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
        (el as { dispatchEvent: (ev: Event) => void }).dispatchEvent(
            new Event("click", { bubbles: true }),
        );
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.test("InlineImageView: Renders collapsible image preview with caption and new-tab link", async () => {
    const { root, cleanup } = setupDom();
    try {
        render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
            root,
        );

        const figure = root.querySelector("figure.inline-image-container");
        assertNotEquals(figure, null, "Must have inline-image-container class");

        // Verify caption text
        const caption = root.querySelector("figcaption");
        assertNotEquals(caption, null);
        assertEquals(caption?.textContent?.includes("System Architecture Diagram"), true);

        // Verify new-tab link
        const link = root.querySelector('a[href="https://example.com/figure.png"]') as HTMLAnchorElement;
        assertNotEquals(link, null);
        assertEquals(link.getAttribute("target"), "_blank");
        assertEquals(link.getAttribute("rel"), "noopener noreferrer");

        // Verify image rendered initially
        const img = root.querySelector("img");
        assertNotEquals(img, null);
        assertEquals(img?.getAttribute("src"), "https://example.com/figure.png");
        assertEquals(img?.getAttribute("alt"), "Architecture Diagram");

        // Test folding
        triggerClick(caption);
        await sleep(20);
        assertEquals(root.querySelector("img"), null, "Image must be hidden when folded");

        // Test unfolding
        triggerClick(caption);
        await sleep(20);
        assertNotEquals(root.querySelector("img"), null, "Image must be restored when unfolded");
    } finally {
        cleanup();
    }
});

Deno.test("InlineImageView: Renders error banner on broken image source", async () => {
    const { root, cleanup } = setupDom();
    try {
        render(<InlineImageView src="https://example.com/broken.jpg" />, root);

        const img = root.querySelector("img");
        assertNotEquals(img, null);

        // Trigger error event
        if (img && typeof img.dispatchEvent === "function") {
            img.dispatchEvent(new Event("error"));
        }
        await sleep(20);

        // Verify error fallback banner
        const errorBanner = root.querySelector(".inline-image-error");
        assertNotEquals(errorBanner, null, "Must display inline-image-error on image error");
        assertEquals(errorBanner?.textContent?.includes("Failed to preview image"), true);

        const errorLink = errorBanner?.querySelector("a") as HTMLAnchorElement;
        assertNotEquals(errorLink, null);
        assertEquals(errorLink.getAttribute("href"), "https://example.com/broken.jpg");
    } finally {
        cleanup();
    }
});

Deno.test("InlineImageView: Zero org- prefixes in element class names", () => {
    const { root, cleanup } = setupDom();
    try {
        render(<InlineImageView src="https://example.com/test.png" title="Generic" />, root);

        const allElements = root.querySelectorAll("*");
        for (const el of allElements) {
            const className = (el as HTMLElement).getAttribute?.("class") || "";
            assertEquals(
                className.includes("org-"),
                false,
                `Element must not contain org- class name: ${className}`,
            );
        }
    } finally {
        cleanup();
    }
});
