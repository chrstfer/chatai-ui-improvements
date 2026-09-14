import { assertEquals, assertNotEquals } from "@std/assert";
import { getAdoptedStyleSheets, getKatexStyleSheet, KATEX_CSS, registerHostTheme } from "@internal/styles";
import { resetStyleSheetCache } from "@internal/tests/fixtures";

class MockCSSStyleSheet {
    cssText = "";
    replaceSync(text: string) {
        this.cssText = text;
    }
}

Deno.test("unit: AdoptedStyleSheets: getAdoptedStyleSheets returns baseline Tailwind stylesheet", () => {
    resetStyleSheetCache();
    const origSheet = globalThis.CSSStyleSheet;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        const sheets = getAdoptedStyleSheets();
        assertEquals(sheets.length, 1);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getAdoptedStyleSheets includes registered host theme stylesheet", () => {
    resetStyleSheetCache();
    const origSheet = globalThis.CSSStyleSheet;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        registerHostTheme("custom-host", ".custom { color: red; }");
        const customSheets = getAdoptedStyleSheets("custom-host");
        assertEquals(customSheets.length, 2);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getKatexStyleSheet instantiates KaTeX stylesheet singleton", () => {
    resetStyleSheetCache();
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
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getKatexStyleSheet reuses cached stylesheet instance on subsequent calls", () => {
    resetStyleSheetCache();
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
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getKatexStyleSheet replaces font root placeholder with extension URL", () => {
    resetStyleSheetCache();
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
        const conditionMet = KATEX_CSS.includes("__KATEX_FONTS_ROOT__")
            ? replacedCss.includes("moz-extension://test-id/vendor/fonts")
            : true;
        assertEquals(conditionMet, true);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        (globalThis as unknown as { browser?: unknown }).browser = origBrowser;
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getAdoptedStyleSheets returns cached sheet reference across repeated calls", () => {
    resetStyleSheetCache();
    const origSheet = globalThis.CSSStyleSheet;
    try {
        globalThis.CSSStyleSheet = MockCSSStyleSheet as unknown as typeof CSSStyleSheet;
        const first = getAdoptedStyleSheets()[0];
        const second = getAdoptedStyleSheets()[0];
        assertEquals(second, first);
    } finally {
        globalThis.CSSStyleSheet = origSheet;
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getAdoptedStyleSheets instantiates CSSStyleSheet exactly once for Tailwind", () => {
    resetStyleSheetCache();
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
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getAdoptedStyleSheets calls replaceSync once across repeated calls", () => {
    resetStyleSheetCache();
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
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: getKatexStyleSheet calls replaceSync once across repeated calls", () => {
    resetStyleSheetCache();
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
        resetStyleSheetCache();
    }
});

Deno.test("unit: AdoptedStyleSheets: adoptedStyleSheets deduplicates stylesheet references across multiple adoption passes", () => {
    resetStyleSheetCache();
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
        resetStyleSheetCache();
    }
});
