import { assertEquals, assertNotEquals } from "@std/assert";
import { bootstrapContentScript, type DocumentLike, type WindowLike } from "../src/entrypoints/app.ts";
import { ChatAdapterRegistry } from "../src/registries/index.ts";
import type { SiteAdapter } from "../src/contracts/chats/index.ts";

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

Deno.test("bootstrapContentScript: Initializes adapter when URL matches", async () => {
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

    const result = await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        currentUrl: "https://gemini.google.com/app",
    });

    assertEquals(result.initialized, true);
    assertEquals(result.reason, "success");
    assertEquals(getInitCalls(), 1);
});

Deno.test("bootstrapContentScript: Exits cleanly when no adapter matches", async () => {
    const registry = new ChatAdapterRegistry();
    const fakeWin: WindowLike = {
        location: { href: "https://unknown-service.com/" },
        addEventListener: () => {},
    };

    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    const result = await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        currentUrl: "https://unknown-service.com/",
    });

    assertEquals(result.initialized, false);
    assertEquals(result.reason, "no_matching_adapter");
});

Deno.test("bootstrapContentScript: Enforces idempotency guard against double-bootstrapping", async () => {
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

    const res1 = await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    assertEquals(res1.initialized, true);
    assertEquals(getInitCalls(), 1);

    // Second invocation on same window
    const res2 = await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    assertEquals(res2.initialized, false);
    assertEquals(res2.reason, "already_initialized");
    assertEquals(getInitCalls(), 1, "Init should not be called a second time");
});

Deno.test("bootstrapContentScript: Teardown on pagehide cleans up adapter and guard", async () => {
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

    const res = await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    assertEquals(res.initialized, true);

    // Simulate page navigation / pagehide
    if (pagehideHandler) {
        (pagehideHandler as () => void)();
    }
    assertEquals(getDestroyCalls(), 1, "Destroy should be invoked on pagehide");
});

Deno.test("bootstrapContentScript: Skips initialization when tab is deactivated in bridge", async () => {
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

    const mockBridge = {
        getInitialState: () => Promise.resolve(false),
        onToggle: () => () => {},
    };

    const res = await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        bridge: mockBridge,
    });

    assertEquals(res.initialized, false);
    assertEquals(getInitCalls(), 0, "Adapter should not be initialized when tab is inactive");
});

Deno.test("bootstrapContentScript: Tears down adapter on disable toggle and re-activates on enable toggle", async () => {
    const registry = new ChatAdapterRegistry();
    let currentAdapter: ReturnType<typeof createLifecycleMockAdapter> | null = null;
    let factoryCount = 0;

    // Factory registering fresh adapters
    registry.registerLazy({
        id: "gemini",
        name: "Google Gemini",
        matches: (url: URL) => url.hostname === "gemini.google.com",
        load: () => {
            factoryCount++;
            currentAdapter = createLifecycleMockAdapter("gemini", "gemini.google.com");
            return Promise.resolve(currentAdapter.adapter);
        },
    });

    let toggleHandler: ((enabled: boolean) => void) | null = null;
    const mockBridge = {
        getInitialState: () => Promise.resolve(true),
        onToggle: (cb: (enabled: boolean) => void) => {
            toggleHandler = cb;
            return () => {};
        },
    };

    const fakeWin: WindowLike = {
        location: { href: "https://gemini.google.com/app" },
        addEventListener: () => {},
    };

    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    const res = await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        bridge: mockBridge,
    });

    assertEquals(res.initialized, true);
    assertEquals(factoryCount, 1);
    assertEquals(currentAdapter!.getInitCalls(), 1);
    assertEquals(currentAdapter!.getDestroyCalls(), 0);

    // 1. Toggle OFF via toolbar action
    assertNotEquals(toggleHandler, null);
    toggleHandler!(false);
    assertEquals(currentAdapter!.getDestroyCalls(), 1, "Active adapter should be destroyed on disable");

    // 2. Toggle back ON via toolbar action -> loads fresh adapter instance and initializes
    toggleHandler!(true);
    // Allow microtask tick for async startAdapter
    await new Promise((resolve) => setTimeout(resolve, 10));
    assertEquals(factoryCount, 2, "Fresh adapter instance should be loaded on re-enable");
    assertEquals(currentAdapter!.getInitCalls(), 1, "New adapter should be initialized");
});
