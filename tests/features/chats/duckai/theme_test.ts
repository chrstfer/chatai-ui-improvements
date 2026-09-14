import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { DuckAiThemeAuthority } from "../../../../src/features/chats/duckai/theme.ts";

type MutationCallback = (mutations: MutationRecord[]) => void;

class MockMutationObserver {
    public callback: MutationCallback;
    public target: unknown = null;
    public options: unknown = null;
    public disconnected = false;
    public static instances: MockMutationObserver[] = [];

    constructor(callback: MutationCallback) {
        this.callback = callback;
        MockMutationObserver.instances.push(this);
    }

    observe(target: unknown, options: unknown) {
        this.target = target;
        this.options = options;
        this.disconnected = false;
    }

    disconnect() {
        this.disconnected = true;
    }

    trigger(mutations: Partial<MutationRecord>[]) {
        if (!this.disconnected) {
            this.callback(mutations as MutationRecord[]);
        }
    }
}

function setupDom(html: string = "<!DOCTYPE html><html><head></head><body></body></html>") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("Failed to create mock DOM");

    interface GlobalDomScope {
        document?: unknown;
        window?: unknown;
        MutationObserver?: unknown;
    }
    const scope = globalThis as unknown as GlobalDomScope;
    const origDoc = scope.document;
    const origWindow = scope.window;
    const origMO = scope.MutationObserver;

    scope.document = doc;
    scope.MutationObserver = MockMutationObserver;
    MockMutationObserver.instances = [];

    let mediaMatches = false;
    const mediaListeners: (() => void)[] = [];

    scope.window = {
        matchMedia: (query: string) => ({
            query,
            matches: mediaMatches,
            addEventListener: (_event: string, cb: () => void) => {
                mediaListeners.push(cb);
            },
            removeEventListener: (_event: string, cb: () => void) => {
                const idx = mediaListeners.indexOf(cb);
                if (idx !== -1) mediaListeners.splice(idx, 1);
            },
        }),
    };

    return {
        doc,
        setMediaMatches: (val: boolean) => {
            mediaMatches = val;
            mediaListeners.forEach((cb) => cb());
        },
        cleanup: () => {
            scope.document = origDoc;
            scope.window = origWindow;
            scope.MutationObserver = origMO;
        },
    };
}

Deno.test("DuckAiThemeAuthority: Resolves theme from data-theme attribute on documentElement", () => {
    const { doc: _doc, cleanup } = setupDom("<!DOCTYPE html><html data-theme='dark'><body></body></html>");
    try {
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "dark");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiThemeAuthority: Resolves theme from body class", () => {
    const { doc: _doc, cleanup } = setupDom("<!DOCTYPE html><html><body class='dark'></body></html>");
    try {
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "dark");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiThemeAuthority: Falls back to matchMedia when no attributes are present", () => {
    const { doc: _doc, setMediaMatches, cleanup } = setupDom("<!DOCTYPE html><html><body></body></html>");
    try {
        setMediaMatches(true); // prefers dark
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "dark");

        setMediaMatches(false); // prefers light
        assertEquals(themeAuth.getTheme(), "light");
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});

Deno.test("DuckAiThemeAuthority: MutationObserver dispatches theme change notifications", () => {
    const { doc, cleanup } = setupDom("<!DOCTYPE html><html data-theme='light'><body></body></html>");
    try {
        const themeAuth = new DuckAiThemeAuthority();
        assertEquals(themeAuth.getTheme(), "light");

        const receivedThemes: string[] = [];
        const unsubscribe = themeAuth.onThemeChange((theme) => {
            receivedThemes.push(theme);
        });

        // Mutate attribute and trigger mock MutationObserver
        doc.documentElement?.setAttribute("data-theme", "dark");
        const mo = MockMutationObserver.instances[0];
        assertNotEquals(mo, undefined);

        mo.trigger([{
            type: "attributes",
            attributeName: "data-theme",
            target: doc.documentElement as unknown as Node,
        }]);

        assertEquals(receivedThemes.length, 1);
        assertEquals(receivedThemes[0], "dark");

        unsubscribe();
        themeAuth.destroy();
    } finally {
        cleanup();
    }
});
