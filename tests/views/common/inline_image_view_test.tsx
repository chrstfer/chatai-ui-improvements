import { assertEquals, assertNotEquals } from "@std/assert";
import { cleanup, render } from "@testing-library/preact";
import { setupTestDom, triggerClick } from "../../fixtures/dom_fixture.ts";
import { InlineImageView } from "../../../src/views/common/InlineImageView.tsx";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.test("unit: InlineImageView renders figure with inline-image-container class", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const figure = container.querySelector("figure.inline-image-container");
        assertNotEquals(figure, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView renders figcaption with title text", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const caption = container.querySelector("figcaption");
        assertEquals(caption?.textContent?.includes("System Architecture Diagram"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView renders link to image source with _blank target", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const link = container.querySelector('a[href="https://example.com/figure.png"]');
        assertEquals(link?.getAttribute("target"), "_blank");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView renders link to image source with noopener noreferrer rel", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const link = container.querySelector('a[href="https://example.com/figure.png"]');
        assertEquals(link?.getAttribute("rel"), "noopener noreferrer");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView renders img with specified src attribute", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const img = container.querySelector("img");
        assertEquals(img?.getAttribute("src"), "https://example.com/figure.png");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView renders img with specified alt attribute", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const img = container.querySelector("img");
        assertEquals(img?.getAttribute("alt"), "Architecture Diagram");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView hides img when figcaption is clicked to fold", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const caption = container.querySelector("figcaption");
        assertNotEquals(caption, null);
        triggerClick(caption!);
        await sleep(20);
        assertEquals(container.querySelector("img"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView restores img when figcaption is clicked twice to unfold", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView
                src="https://example.com/figure.png"
                title="System Architecture Diagram"
                alt="Architecture Diagram"
            />,
        );
        const caption = container.querySelector("figcaption");
        assertNotEquals(caption, null);
        triggerClick(caption!);
        await sleep(20);
        triggerClick(caption!);
        await sleep(20);
        assertNotEquals(container.querySelector("img"), null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView renders error banner when image triggers error event", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<InlineImageView src="https://example.com/broken.jpg" />);
        const img = container.querySelector("img");
        assertNotEquals(img, null);
        img!.dispatchEvent(new Event("error"));
        await sleep(20);
        const errorBanner = container.querySelector(".inline-image-error");
        assertNotEquals(errorBanner, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView error banner contains failure message", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<InlineImageView src="https://example.com/broken.jpg" />);
        const img = container.querySelector("img");
        assertNotEquals(img, null);
        img!.dispatchEvent(new Event("error"));
        await sleep(20);
        const errorBanner = container.querySelector(".inline-image-error");
        assertEquals(errorBanner?.textContent?.includes("Failed to preview image"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView error banner contains link to image source", async () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<InlineImageView src="https://example.com/broken.jpg" />);
        const img = container.querySelector("img");
        assertNotEquals(img, null);
        img!.dispatchEvent(new Event("error"));
        await sleep(20);
        const errorLink = container.querySelector(".inline-image-error a");
        assertEquals(errorLink?.getAttribute("href"), "https://example.com/broken.jpg");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: InlineImageView contains zero org- prefixed class names", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(
            <InlineImageView src="https://example.com/test.png" title="Generic" />,
        );
        const allElements = container.querySelectorAll("*");
        let hasOrgPrefix = false;
        for (const el of allElements) {
            const className = (el as HTMLElement).getAttribute?.("class") || "";
            if (className.includes("org-")) {
                hasOrgPrefix = true;
                break;
            }
        }
        assertEquals(hasOrgPrefix, false);
    } finally {
        cleanup();
        domCleanup();
    }
});
