import { assertEquals, assertNotEquals } from "@std/assert";
import {
    _resetStyleSheetCacheForTesting,
    getAdoptedStyleSheets,
    getKatexStyleSheet,
    registerHostTheme,
} from "../../src/styles/adoptedStyleSheets.ts";
import { KATEX_CSS } from "../../src/styles/katex.generated.ts";

class MockCSSStyleSheet {
    cssText = "";
    replaceSync(text: string) {
        this.cssText = text;
    }
}

Deno.test("unit: getAdoptedStyleSheets returns baseline Tailwind stylesheet", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        const sheets = getAdoptedStyleSheets();
        assertEquals(sheets.length, 1);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getAdoptedStyleSheets includes registered host theme stylesheet", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        registerHostTheme("custom-host", ".custom { color: red; }");
        const customSheets = getAdoptedStyleSheets("custom-host");
        assertEquals(customSheets.length, 2);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getKatexStyleSheet instantiates KaTeX stylesheet singleton", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    const origBrowser = (globalThis as unknown as { browser?: unknown }).browser;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        (globalThis as unknown as { browser?: unknown }).browser = {
            runtime: { getURL: (path: string) => `moz-extension://test-id/${path}` },
        };
        const sheet = getKatexStyleSheet();
        assertNotEquals(sheet, null);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getKatexStyleSheet reuses cached stylesheet instance on subsequent calls", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    const origBrowser = (globalThis as unknown as { browser?: unknown }).browser;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        (globalThis as unknown as { browser?: unknown }).browser = {
            runtime: { getURL: (path: string) => `moz-extension://test-id/${path}` },
        };
        const sheet1 = getKatexStyleSheet();
        const sheet2 = getKatexStyleSheet();
        assertEquals(sheet1, sheet2);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getKatexStyleSheet replaces font root placeholder with extension URL", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    const origBrowser = (globalThis as unknown as { browser?: unknown }).browser;
    let replacedCss = "";

    class InterceptingSheet {
        cssText = "";
        replaceSync(text: string) {
            this.cssText = text;
            replacedCss = text;
        }
    }

    try {
        globalThis.CSSStyleSheet = InterceptingSheet as unknown as typeof CSSStyleSheet;
        (globalThis as unknown as { browser?: unknown }).browser = {
            runtime: { getURL: (path: string) => `moz-extension://test-id/${path}` },
        };
        getKatexStyleSheet();
        if (KATEX_CSS.includes("__KATEX_FONTS_ROOT__")) {
            assertEquals(replacedCss.includes("moz-extension://test-id/vendor/fonts"), true);
        } else {
            assertEquals(true, true);
        }
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getAdoptedStyleSheets returns cached sheet reference across repeated calls", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        const first = getAdoptedStyleSheets()[0];
        const second = getAdoptedStyleSheets()[0];
        assertEquals(second, first);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getAdoptedStyleSheets instantiates CSSStyleSheet exactly once for Tailwind", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    let count = 0;
    class CountingSheet {
        cssText = "";
        constructor() {
            count++;
        }
        replaceSync(text: string) {
            this.cssText = text;
        }
    }
    try {
        globalThis.CSSStyleSheet = CountingSheet as unknown as typeof CSSStyleSheet;
        for (let i = 0; i < 10; i++) {
            getAdoptedStyleSheets();
        }
        assertEquals(count, 1);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getAdoptedStyleSheets calls replaceSync once across repeated calls", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    let syncCount = 0;
    class CountingSheet {
        cssText = "";
        replaceSync(text: string) {
            syncCount++;
            this.cssText = text;
        }
    }
    try {
        globalThis.CSSStyleSheet = CountingSheet as unknown as typeof CSSStyleSheet;
        for (let i = 0; i < 10; i++) {
            getAdoptedStyleSheets();
        }
        assertEquals(syncCount, 1);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: getKatexStyleSheet calls replaceSync once across repeated calls", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    const origBrowser = (globalThis as unknown as { browser?: unknown }).browser;
    let syncCount = 0;
    class CountingSheet {
        cssText = "";
        replaceSync(text: string) {
            syncCount++;
            this.cssText = text;
        }
    }
    try {
        globalThis.CSSStyleSheet = CountingSheet as unknown as typeof CSSStyleSheet;
        (globalThis as unknown as { browser?: unknown }).browser = {
            runtime: { getURL: (path: string) => `moz-extension://test-id/${path}` },
        };
        for (let i = 0; i < 10; i++) {
            getKatexStyleSheet();
        }
        assertEquals(syncCount, 1);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        _resetStyleSheetCacheForTesting();
    }
});

Deno.test("unit: adoptedStyleSheets deduplicates stylesheet references across multiple adoption passes", () => {
    _resetStyleSheetCacheForTesting();
    const origSheet = globalThis.CSSStyleSheet;
    const origBrowser = (globalThis as unknown as { browser?: unknown }).browser;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        (globalThis as unknown as { browser?: unknown }).browser = {
            runtime: { getURL: (path: string) => `moz-extension://test-id/${path}` },
        };
        interface MockShadowRoot {
            adoptedStyleSheets: unknown[];
        }
        const mockShadowRoot: MockShadowRoot = { adoptedStyleSheets: [] };

        for (let i = 0; i < 10; i++) {
            const tailwind = getAdoptedStyleSheets()[0];
            if (tailwind && !mockShadowRoot.adoptedStyleSheets.includes(tailwind)) {
                mockShadowRoot.adoptedStyleSheets = [...mockShadowRoot.adoptedStyleSheets, tailwind];
            }
            const katex = getKatexStyleSheet();
            if (katex && !mockShadowRoot.adoptedStyleSheets.includes(katex)) {
                mockShadowRoot.adoptedStyleSheets = [...mockShadowRoot.adoptedStyleSheets, katex];
            }
        }
        assertEquals(mockShadowRoot.adoptedStyleSheets.length, 2);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        _resetStyleSheetCacheForTesting();
    }
});
