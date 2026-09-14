import { assertEquals } from "@std/assert";
import { bootstrapContentScript, type DocumentLike, type WindowLike } from "../../src/entrypoints/app.ts";
import { ChatAdapterRegistry } from "../../src/registries/index.ts";
import type { SiteAdapter } from "../../src/contracts/chats/index.ts";

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

Deno.test("integration: bootstrapContentScript initializes matched adapter successfully", async () => {
    const registry = new ChatAdapterRegistry();
    const { adapter } = createLifecycleMockAdapter("gemini", "gemini.google.com");
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
});

Deno.test("integration: bootstrapContentScript reports success reason on matched adapter initialization", async () => {
    const registry = new ChatAdapterRegistry();
    const { adapter } = createLifecycleMockAdapter("gemini", "gemini.google.com");
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

    assertEquals(result.reason, "success");
});

Deno.test("integration: bootstrapContentScript calls initialize method on matched adapter", async () => {
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

    await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        currentUrl: "https://gemini.google.com/app",
    });

    assertEquals(getInitCalls(), 1);
});

Deno.test("integration: bootstrapContentScript skips initialization when no adapter matches URL", async () => {
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
});

Deno.test("integration: bootstrapContentScript reports no_matching_adapter reason when URL unmatched", async () => {
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

    assertEquals(result.reason, "no_matching_adapter");
});

Deno.test("integration: bootstrapContentScript prevents re-initialization on subsequent calls", async () => {
    const registry = new ChatAdapterRegistry();
    const { adapter } = createLifecycleMockAdapter("gemini", "gemini.google.com");
    registry.register(adapter);

    const fakeWin: WindowLike = {
        location: { href: "https://gemini.google.com/app" },
        addEventListener: () => {},
    };
    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    const res2 = await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });

    assertEquals(res2.initialized, false);
});

Deno.test("integration: bootstrapContentScript reports already_initialized reason on duplicate bootstrap", async () => {
    const registry = new ChatAdapterRegistry();
    const { adapter } = createLifecycleMockAdapter("gemini", "gemini.google.com");
    registry.register(adapter);

    const fakeWin: WindowLike = {
        location: { href: "https://gemini.google.com/app" },
        addEventListener: () => {},
    };
    const fakeDoc: DocumentLike = {
        readyState: "complete",
        addEventListener: () => {},
    };

    await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    const res2 = await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });

    assertEquals(res2.reason, "already_initialized");
});

Deno.test("integration: bootstrapContentScript calls adapter destroy on window pagehide event", async () => {
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

    await bootstrapContentScript({ registry, win: fakeWin, doc: fakeDoc });
    if (pagehideHandler) (pagehideHandler as () => void)();

    assertEquals(getDestroyCalls(), 1);
});

Deno.test("integration: bootstrapContentScript skips initialization when tab is deactivated in bridge", async () => {
    const registry = new ChatAdapterRegistry();
    const { adapter } = createLifecycleMockAdapter("gemini", "gemini.google.com");
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
});

Deno.test("integration: bootstrapContentScript leaves adapter uninitialized when bridge reports tab disabled", async () => {
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

    await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        bridge: mockBridge,
    });

    assertEquals(getInitCalls(), 0);
});

Deno.test("integration: bootstrapContentScript tears down active adapter when tab bridge toggles disabled", async () => {
    const registry = new ChatAdapterRegistry();
    let currentAdapter: ReturnType<typeof createLifecycleMockAdapter> | null = null;

    registry.registerLazy({
        id: "gemini",
        name: "Google Gemini",
        matches: (url: URL) => url.hostname === "gemini.google.com",
        load: () => {
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

    await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        bridge: mockBridge,
    });

    toggleHandler!(false);
    assertEquals(currentAdapter!.getDestroyCalls(), 1);
});

Deno.test("integration: bootstrapContentScript re-loads and initializes fresh adapter when tab bridge toggles enabled", async () => {
    const registry = new ChatAdapterRegistry();
    let currentAdapter: ReturnType<typeof createLifecycleMockAdapter> | null = null;
    let factoryCount = 0;

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

    await bootstrapContentScript({
        registry,
        win: fakeWin,
        doc: fakeDoc,
        bridge: mockBridge,
    });

    toggleHandler!(false);
    toggleHandler!(true);
    await new Promise((resolve) => setTimeout(resolve, 20));

    assertEquals(factoryCount, 2);
});
