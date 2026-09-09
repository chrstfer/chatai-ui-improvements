import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { LatexMathView } from "../../../src/views/common/LatexMathView.tsx";
import { _resetStyleSheetCacheForTesting, getKatexStyleSheet } from "../../../src/styles/adoptedStyleSheets.ts";

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

Deno.test("LatexMathView: Renders inline KaTeX expression into declarative JSX elements without innerHTML", () => {
    const { root, cleanup } = setupDom();
    try {
        render(<LatexMathView value="x^2 + y^2 = z^2" />, root);

        const container = root.querySelector(".latex-math");
        assertNotEquals(container, null, "Container must have latex-math class");
        assertEquals(container?.tagName.toLowerCase(), "span");
        assertEquals(container?.className.includes("inline-block"), true);

        // Verify KaTeX rendered hierarchy
        const katexEl = root.querySelector(".katex");
        assertNotEquals(katexEl, null, "Must contain .katex element");

        const katexHtml = root.querySelector(".katex-html");
        assertNotEquals(katexHtml, null, "Must contain .katex-html element");

        // Verify math contents
        assertEquals(root.textContent?.includes("x"), true);
        assertEquals(root.textContent?.includes("2"), true);
    } finally {
        cleanup();
    }
});

Deno.test("LatexMathView: Trims $$ and LaTeX delimiters and detects display mode", () => {
    const { root, cleanup } = setupDom();
    try {
        render(<LatexMathView value="$$\int_0^\infty e^{-x} dx = 1$$" />, root);

        const container = root.querySelector(".latex-math");
        assertNotEquals(container, null);
        assertEquals(container?.tagName.toLowerCase(), "div");
        assertEquals(container?.className.includes("text-center"), true);
        assertEquals(container?.className.includes("block"), true);

        const katexEl = root.querySelector(".katex");
        assertNotEquals(katexEl, null);
        assertEquals(root.textContent?.includes("dx"), true);
    } finally {
        cleanup();
    }
});

Deno.test("LatexMathView: Renders styled typography fallback when expression cannot be rendered", () => {
    const { root, cleanup } = setupDom();
    try {
        render(<LatexMathView value="\\invalid{macro" />, root);

        const container = root.querySelector(".latex-math, .math-fallback");
        assertNotEquals(container, null, "Must render either error span or fallback");
    } finally {
        cleanup();
    }
});

Deno.test("LatexMathView: Adopts KaTeX stylesheet when mounted inside a ShadowRoot", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;

    class MockCSSStyleSheet {
        cssText = "";
        replaceSync(text: string) {
            this.cssText = text;
        }
    }

    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;

        const { root, cleanup } = setupDom();

        class MockShadowRoot {
            adoptedStyleSheets: unknown[] = [];
        }
        const mockShadow = new MockShadowRoot();
        (root as unknown as { getRootNode: () => unknown }).getRootNode = () => mockShadow;

        render(<LatexMathView value="E = mc^2" />, root);

        const katexSheet = getKatexStyleSheet();
        assertNotEquals(katexSheet, null);
        assertEquals(
            mockShadow.adoptedStyleSheets.includes(katexSheet),
            true,
            "ShadowRoot must adopt KaTeX stylesheet",
        );
        cleanup();
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});
