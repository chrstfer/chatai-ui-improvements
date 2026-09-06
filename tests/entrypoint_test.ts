import { assertEquals } from "@std/assert";
import { bootstrapContentScript, type DocumentLike, type WindowLike } from "../src/entrypoints/content.ts";
import { ChatAdapterRegistry } from "../src/chat/registry.ts";
import type { SiteAdapter } from "../src/core/contracts/index.ts";

function createLifecycleMockAdapter(id: string, hostname: string) {
    let initCalls = 0;
    let destroyCalls = 0;

    const adapter: SiteAdapter = {
        id,
        name: `Lifecycle ${id}`,
        themeAuthority: {
            supportsTheming: false,
            getTheme: () => "light",
            onThemeChange: () => () => {},
        },
        matches: (url: URL) => url.hostname === hostname,
        initialize: () => {
            initCalls++;
        },
        destroy: () => {
            destroyCalls++;
        },
    };

    return {
        adapter,
        getInitCalls: () => initCalls,
        getDestroyCalls: () => destroyCalls,
    };
}

Deno.test("bootstrapContentScript: Initializes adapter when URL matches", () => {
    const registry = new ChatAdapterRegistry();
    const { adapter, getInitCalls } = createLifecycleMockAdapter("gemini", "gemini.google.com");
    registry.register(adapter);

    const fakeWin: WindowLike = {
        location: { href: "https://gemini.google.com/app" },
        addEventListener: () => {},
    };

    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    const result = bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        currentUrl: "https://gemini.google.com/app",
    });

    assertEquals(result.initialized, true);
    assertEquals(result.reason, "success");
    assertEquals(getInitCalls(), 1);
});

Deno.test("bootstrapContentScript: Exits cleanly when no adapter matches", () => {
    const registry = new ChatAdapterRegistry();
    const fakeWin: WindowLike = {
        location: { href: "https://unknown-service.com/" },
        addEventListener: () => {},
    };

    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    const result = bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        currentUrl: "https://unknown-service.com/",
    });

    assertEquals(result.initialized, false);
    assertEquals(result.reason, "no_matching_adapter");
});

Deno.test("bootstrapContentScript: Enforces idempotency guard against double-bootstrapping", () => {
    const registry = new ChatAdapterRegistry();
    const { adapter, getInitCalls } = createLifecycleMockAdapter("gemini", "gemini.google.com");
    registry.register(adapter);

    const fakeWin: WindowLike = {
        location: { href: "https://gemini.google.com/app" },
        addEventListener: () => {},
    };

    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    const res1 = bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    assertEquals(res1.initialized, true);
    assertEquals(getInitCalls(), 1);

    // Second invocation on same window
    const res2 = bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    assertEquals(res2.initialized, false);
    assertEquals(res2.reason, "already_initialized");
    assertEquals(getInitCalls(), 1, "Init should not be called a second time");
});

Deno.test("bootstrapContentScript: Teardown on pagehide cleans up adapter and guard", () => {
    const registry = new ChatAdapterRegistry();
    const { adapter, getDestroyCalls } = createLifecycleMockAdapter("gemini", "gemini.google.com");
    registry.register(adapter);

    let pagehideHandler: ((event?: unknown) => void) | null = null;
    const fakeWin: WindowLike = {
        location: { href: "https://gemini.google.com/app" },
        addEventListener: (event: string, handler: (event?: unknown) => void) => {
            if (event === "pagehide") pagehideHandler = handler;
        },
    };

    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    const res = bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    assertEquals(res.initialized, true);

    // Simulate page navigation / pagehide
    if (pagehideHandler) {
        (pagehideHandler as () => void)();
    }
    assertEquals(getDestroyCalls(), 1, "Destroy should be invoked on pagehide");
});
