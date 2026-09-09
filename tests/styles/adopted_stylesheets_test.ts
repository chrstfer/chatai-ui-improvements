import { assertEquals, assertNotEquals } from "@std/assert";
import {
    _resetStyleSheetCacheForTesting,
    getAdoptedStyleSheets,
    getKatexStyleSheet,
    registerHostTheme,
} from "../../src/styles/adoptedStyleSheets.ts";
import { KATEX_CSS } from "../../src/styles/katex.generated.ts";

Deno.test("adoptedStyleSheets: getAdoptedStyleSheets returns Tailwind sheet and registers host themes", () => {
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

        const sheets = getAdoptedStyleSheets();
        assertEquals(sheets.length, 1);

        registerHostTheme("custom-host", ".custom { color: red; }");
        const customSheets = getAdoptedStyleSheets("custom-host");
        assertEquals(customSheets.length, 2);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("adoptedStyleSheets: getKatexStyleSheet returns KaTeX singleton and replaces font root", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    const origBrowser = (globalThis as unknown as { browser?: unknown }).browser;
    let replacedCss = "";

    class MockCSSStyleSheet {
        cssText = "";
        replaceSync(text: string) {
            this.cssText = text;
            replacedCss = text;
        }
    }

    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        (globalThis as unknown as { browser?: unknown }).browser = {
            runtime: {
                getURL: (path: string) => `moz-extension://test-id/${path}`,
            },
        };

        const sheet = getKatexStyleSheet();
        assertNotEquals(sheet, null);

        // Same singleton instance on consecutive calls
        const sheet2 = getKatexStyleSheet();
        assertEquals(sheet, sheet2);

        // Verify font placeholder replacement
        if (KATEX_CSS.includes("__KATEX_FONTS_ROOT__")) {
            assertEquals(replacedCss.includes("moz-extension://test-id/vendor/fonts"), true);
            assertEquals(replacedCss.includes("__KATEX_FONTS_ROOT__"), false);
        }
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("adoptedStyleSheets: stylesheets are only parsed once and shared by reference to prevent memory leaks", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;

    let constructorCallCount = 0;
    let replaceSyncCallCount = 0;

    class TrackedCSSStyleSheet {
        cssText = "";
        constructor() {
            constructorCallCount++;
        }
        replaceSync(text: string) {
            replaceSyncCallCount++;
            this.cssText = text;
        }
    }

    try {
        globalThis.CSSStyleSheet = TrackedCSSStyleSheet as unknown as typeof CSSStyleSheet;

        // 1. Verify Tailwind CSS singleton caching across 50 consecutive calls
        const firstTailwindSheet = getAdoptedStyleSheets()[0];
        for (let i = 0; i < 49; i++) {
            const subsequentSheet = getAdoptedStyleSheets()[0];
            assertEquals(
                subsequentSheet,
                firstTailwindSheet,
                "All getAdoptedStyleSheets calls must return the identical object reference",
            );
        }
        assertEquals(constructorCallCount, 1, "Tailwind CSSStyleSheet must only be instantiated once");
        assertEquals(replaceSyncCallCount, 1, "Tailwind replaceSync must only be invoked once across 50 calls");

        // 2. Verify KaTeX CSS singleton caching across 50 consecutive calls
        const firstKatexSheet = getKatexStyleSheet();
        for (let i = 0; i < 49; i++) {
            const subsequentKatexSheet = getKatexStyleSheet();
            assertEquals(
                subsequentKatexSheet,
                firstKatexSheet,
                "All getKatexStyleSheet calls must return the identical object reference",
            );
        }
        assertEquals(
            constructorCallCount,
            2,
            "KaTeX CSSStyleSheet must only be instantiated once (total 2 with Tailwind)",
        );
        assertEquals(replaceSyncCallCount, 2, "KaTeX replaceSync must only be invoked once across 50 calls");

        // 3. Verify Shadow Root adoption deduplication prevents memory leaks
        interface MockShadowRoot {
            adoptedStyleSheets: unknown[];
        }
        const mockShadowRoot: MockShadowRoot = { adoptedStyleSheets: [] };

        // Simulate 20 components or re-renders attempting to adopt KaTeX and Tailwind
        for (let i = 0; i < 20; i++) {
            const tailwind = getAdoptedStyleSheets()[0];
            if (tailwind && !mockShadowRoot.adoptedStyleSheets.includes(tailwind)) {
                mockShadowRoot.adoptedStyleSheets = [...mockShadowRoot.adoptedStyleSheets, tailwind];
            }

            const katex = getKatexStyleSheet();
            if (katex && !mockShadowRoot.adoptedStyleSheets.includes(katex)) {
                mockShadowRoot.adoptedStyleSheets = [...mockShadowRoot.adoptedStyleSheets, katex];
            }
        }

        assertEquals(
            mockShadowRoot.adoptedStyleSheets.length,
            2,
            "ShadowRoot must contain exactly 2 unique stylesheet references despite 20 adoption passes",
        );
        assertEquals(mockShadowRoot.adoptedStyleSheets[0], firstTailwindSheet);
        assertEquals(mockShadowRoot.adoptedStyleSheets[1], firstKatexSheet);

        // Constructor and replaceSync counts remain unchanged
        assertEquals(constructorCallCount, 2);
        assertEquals(replaceSyncCallCount, 2);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});
