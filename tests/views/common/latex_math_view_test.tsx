import { assertEquals, assertNotEquals } from "@std/assert";
import { cleanup, render } from "@testing-library/preact";
import { setupTestDom } from "../../fixtures/dom_fixture.ts";
import { LatexMathView } from "../../../src/views/common/LatexMathView.tsx";
import { _resetStyleSheetCacheForTesting, getKatexStyleSheet } from "../../../src/styles/adoptedStyleSheets.ts";

Deno.test("unit: LatexMathView: renders container with latex-math class for inline expression", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="x^2 + y^2 = z^2" />);
        const mathEl = container.querySelector(".latex-math");
        assertNotEquals(mathEl, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders span tag for inline math", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="x^2 + y^2 = z^2" />);
        const mathEl = container.querySelector(".latex-math");
        assertEquals(mathEl?.tagName.toLowerCase(), "span");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: adds inline-block class for inline math", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="x^2 + y^2 = z^2" />);
        const mathEl = container.querySelector(".latex-math");
        assertEquals(mathEl?.className.includes("inline-block"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders katex element hierarchy", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="x^2 + y^2 = z^2" />);
        const katexEl = container.querySelector(".katex");
        assertNotEquals(katexEl, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders math content variables", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="x^2 + y^2 = z^2" />);
        assertEquals(container.textContent?.includes("x"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders div tag for display math delimited by $", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="$$\int_0^\infty e^{-x} dx = 1$$" />);
        const mathEl = container.querySelector(".latex-math");
        assertEquals(mathEl?.tagName.toLowerCase(), "div");
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: adds text-center class for display math", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="$$\int_0^\infty e^{-x} dx = 1$$" />);
        const mathEl = container.querySelector(".latex-math");
        assertEquals(mathEl?.className.includes("text-center"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: adds block class for display math", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="$$\int_0^\infty e^{-x} dx = 1$$" />);
        const mathEl = container.querySelector(".latex-math");
        assertEquals(mathEl?.className.includes("block"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders katex element hierarchy for display math", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="$$\int_0^\infty e^{-x} dx = 1$$" />);
        const katexEl = container.querySelector(".katex");
        assertNotEquals(katexEl, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders display math contents", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="$$\int_0^\infty e^{-x} dx = 1$$" />);
        assertEquals(container.textContent?.includes("dx"), true);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: renders fallback element when expression contains syntax error", () => {
    const { cleanup: domCleanup } = setupTestDom();
    try {
        const { container } = render(<LatexMathView value="\\invalid{macro" />);
        const fallback = container.querySelector(".latex-math, .math-fallback");
        assertNotEquals(fallback, null);
    } finally {
        cleanup();
        domCleanup();
    }
});

Deno.test("unit: LatexMathView: adopts KaTeX stylesheet when mounted inside ShadowRoot", () => {
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
        const { doc, cleanup: domCleanup } = setupTestDom();

        class MockShadowRoot {
            adoptedStyleSheets: unknown[] = [];
        }
        const mockShadow = new MockShadowRoot();

        const mountPoint = doc.createElement("div");
        (mountPoint as unknown as { getRootNode: () => unknown }).getRootNode = () => mockShadow;
        doc.body.appendChild(mountPoint);

        render(<LatexMathView value="E = mc^2" />, { container: mountPoint });

        const katexSheet = getKatexStyleSheet();
        assertEquals(mockShadow.adoptedStyleSheets.includes(katexSheet), true);

        cleanup();
        domCleanup();
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});
