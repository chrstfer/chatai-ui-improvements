import { assertEquals, assertNotEquals } from "@std/assert";
import { h, render } from "preact";
import {
    CoreLogger,
    createLogger,
    installBrowserHooks,
    installConsoleApi,
    installPreactHooks,
    isExtensionError,
    LogLevel,
    LogRingBuffer,
    RunlevelManager,
} from "../../../src/core/logging/index.ts";
import { setupTestDom } from "../../fixtures/dom_fixture.ts";

Deno.test("unit: RunlevelManager: defaults to DEBUG level in dev mode", () => {
    // Arrange & Act
    const mgr = new RunlevelManager("dev");

    // Assert
    assertEquals(mgr.getEffectiveLogLevel(), LogLevel.DEBUG);
});

Deno.test("unit: RunlevelManager: defaults to WARN level in test mode", () => {
    // Arrange & Act
    const mgr = new RunlevelManager("test");

    // Assert
    assertEquals(mgr.getEffectiveLogLevel(), LogLevel.WARN);
});

Deno.test("unit: RunlevelManager: defaults to WARN level in prod mode", () => {
    // Arrange & Act
    const mgr = new RunlevelManager("prod");

    // Assert
    assertEquals(mgr.getEffectiveLogLevel(), LogLevel.WARN);
});

Deno.test("unit: RunlevelManager: enables all levels when log level is DEBUG", () => {
    // Arrange
    const mgr = new RunlevelManager("dev");

    // Act
    const debugEnabled = mgr.isLevelEnabled(LogLevel.DEBUG);

    // Assert
    assertEquals(debugEnabled, true);
});

Deno.test("unit: RunlevelManager: filters DEBUG and INFO when log level is WARN", () => {
    // Arrange
    const mgr = new RunlevelManager("prod");

    // Act
    const debugEnabled = mgr.isLevelEnabled(LogLevel.DEBUG);

    // Assert
    assertEquals(debugEnabled, false);
});

Deno.test("unit: RunlevelManager: supports dynamic log level override", () => {
    // Arrange
    const mgr = new RunlevelManager("prod");

    // Act
    mgr.setLogLevel(LogLevel.DEBUG);

    // Assert
    assertEquals(mgr.getEffectiveLogLevel(), LogLevel.DEBUG);
});

Deno.test("unit: RunlevelManager: resets to runlevel default when override cleared", () => {
    // Arrange
    const mgr = new RunlevelManager("prod");
    mgr.setLogLevel(LogLevel.DEBUG);

    // Act
    mgr.setLogLevel(null);

    // Assert
    assertEquals(mgr.getEffectiveLogLevel(), LogLevel.WARN);
});

Deno.test("unit: LogRingBuffer: initializes with zero entries", () => {
    // Arrange & Act
    const buffer = new LogRingBuffer(3);

    // Assert
    assertEquals(buffer.size, 0);
});

Deno.test("unit: LogRingBuffer: appends entries in sequential order", () => {
    // Arrange
    const buffer = new LogRingBuffer(3);

    // Act
    buffer.push({ timestamp: 1, level: LogLevel.INFO, scope: "Test", message: "msg 1" });
    buffer.push({ timestamp: 2, level: LogLevel.INFO, scope: "Test", message: "msg 2" });

    // Assert
    assertEquals(buffer.getEntries().map((e) => e.message), ["msg 1", "msg 2"]);
});

Deno.test("unit: LogRingBuffer: evicts oldest entry when exceeding capacity", () => {
    // Arrange
    const buffer = new LogRingBuffer(3);
    buffer.push({ timestamp: 1, level: LogLevel.INFO, scope: "Test", message: "msg 1" });
    buffer.push({ timestamp: 2, level: LogLevel.INFO, scope: "Test", message: "msg 2" });
    buffer.push({ timestamp: 3, level: LogLevel.INFO, scope: "Test", message: "msg 3" });

    // Act: push fourth entry
    buffer.push({ timestamp: 4, level: LogLevel.INFO, scope: "Test", message: "msg 4" });

    // Assert: msg 1 evicted, size capped at 3
    assertEquals(buffer.getEntries().map((e) => e.message), ["msg 2", "msg 3", "msg 4"]);
});

Deno.test("unit: LogRingBuffer: clear removes all stored entries", () => {
    // Arrange
    const buffer = new LogRingBuffer(3);
    buffer.push({ timestamp: 1, level: LogLevel.INFO, scope: "Test", message: "msg 1" });

    // Act
    buffer.clear();

    // Assert
    assertEquals(buffer.size, 0);
});

Deno.test("unit: CoreLogger: child logger appends child scope segment with chevron separator", () => {
    // Arrange
    const rootLogger = createLogger("Adapter");

    // Act
    const childLogger = rootLogger.child("Scraper");

    // Assert
    assertEquals(childLogger.scope, "Adapter > Scraper");
});

Deno.test("unit: CoreLogger: dispatches log entries to registered custom sink", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const captured: string[] = [];
    const unsubscribe = CoreLogger.addSink((entry) => {
        captured.push(`${entry.scope}: ${entry.message}`);
    });

    try {
        const logger = createLogger("Adapter");

        // Act
        logger.info("Initialized");

        // Assert
        assertEquals(captured, ["Adapter: Initialized"]);
    } finally {
        unsubscribe();
    }
});

Deno.test("unit: CoreLogger: stops dispatching to sink after unsubscribe", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const captured: string[] = [];
    const unsubscribe = CoreLogger.addSink((entry) => {
        captured.push(entry.message);
    });
    const logger = createLogger("Adapter");
    logger.info("First");

    // Act
    unsubscribe();
    logger.info("Second");

    // Assert
    assertEquals(captured, ["First"]);
});

Deno.test("unit: CoreLogger: stores emitted entries in shared ring buffer", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const logger = createLogger("StoreTest");

    // Act
    logger.info("Buffered message");

    // Assert
    const entries = CoreLogger.getRingBuffer().getEntries();
    assertEquals(entries.some((e) => e.message === "Buffered message"), true);
});

Deno.test("unit: CoreLogger: isExtensionError returns false for third-party host script errors", () => {
    // Arrange
    const hostError = {
        filename: "https://www.gstatic.com/chat/app.js",
        message: "NetworkError when attempting to fetch resource",
        error: new Error("Failed to fetch analytics"),
    };

    // Act
    const result = isExtensionError(hostError);

    // Assert
    assertEquals(result, false);
});

Deno.test("unit: CoreLogger: isExtensionError detects extension error by extension scheme in filename", () => {
    // Arrange
    const extError = {
        filename: "moz-extension://1234-uuid/dist/dev/gemini-chunk.js",
        message: "ReferenceError: foo is not defined",
        error: new Error("ReferenceError: foo is not defined"),
    };

    // Act
    const result = isExtensionError(extError);

    // Assert
    assertEquals(result, true);
});

Deno.test("unit: CoreLogger: isExtensionError detects extension error by stack frame path", () => {
    // Arrange
    const extError = {
        message: "TypeError: null is not an object",
        error: {
            stack: "TypeError: null is not an object\n    at inject (dist/dev/app.js:12:34)",
        },
    };

    // Act
    const result = isExtensionError(extError);

    // Assert
    assertEquals(result, true);
});

Deno.test("unit: CoreLogger: installBrowserHooks registers error and lifecycle listeners on window", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const registered = new Set<string>();
    const fakeWin = {
        addEventListener: (event: string) => registered.add(event),
        removeEventListener: (event: string) => registered.delete(event),
    };
    const logger = createLogger("TestBoot");

    // Act
    const sub = installBrowserHooks(logger, fakeWin);

    // Assert
    assertEquals(registered.has("error"), true);
    sub.uninstall();
});

Deno.test("unit: CoreLogger: installBrowserHooks uninstalls all registered event listeners cleanly", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const registered = new Set<string>();
    const fakeWin = {
        addEventListener: (event: string) => registered.add(event),
        removeEventListener: (event: string) => registered.delete(event),
    };
    const logger = createLogger("TestBoot");
    const sub = installBrowserHooks(logger, fakeWin);

    // Act
    sub.uninstall();

    // Assert
    assertEquals(registered.size, 0);
});

Deno.test("unit: CoreLogger: installBrowserHooks logs host error at DEBUG level with prefix", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    let errorHandler: ((ev: unknown) => void) | undefined;
    const fakeWin = {
        addEventListener: (event: string, handler: (ev: unknown) => void) => {
            if (event === "error") errorHandler = handler;
        },
        removeEventListener: () => {},
    };
    const logger = createLogger("TestBoot");
    const sub = installBrowserHooks(logger, fakeWin);

    try {
        // Act
        errorHandler?.({
            filename: "https://gemini.google.com/_/main.js",
            message: "ChunkLoadError",
            lineno: 10,
        });

        // Assert
        const entry = CoreLogger.getRingBuffer().getEntries().find((e) => e.message.includes("[Host Error]"));
        assertEquals(entry?.level, LogLevel.DEBUG);
    } finally {
        sub.uninstall();
    }
});

Deno.test("unit: CoreLogger: installBrowserHooks logs extension error at ERROR level", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    let errorHandler: ((ev: unknown) => void) | undefined;
    const fakeWin = {
        addEventListener: (event: string, handler: (ev: unknown) => void) => {
            if (event === "error") errorHandler = handler;
        },
        removeEventListener: () => {},
    };
    const logger = createLogger("TestBoot");
    const sub = installBrowserHooks(logger, fakeWin);

    try {
        // Act
        errorHandler?.({
            filename: "chrome-extension://xyz/content.js",
            message: "Extension runtime error",
            lineno: 42,
        });

        // Assert
        const entry = CoreLogger.getRingBuffer().getEntries().find((e) =>
            e.message.includes("Unhandled extension error")
        );
        assertEquals(entry?.level, LogLevel.ERROR);
    } finally {
        sub.uninstall();
    }
});

Deno.test("unit: CoreLogger: installPreactHooks records component instantiation and mounting telemetry", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const { doc, cleanup } = setupTestDom({
        html: '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    });

    const logger = createLogger("TestUI");
    const preactSub = installPreactHooks(logger);

    function TestComponent() {
        return h("div", { class: "test-box" }, "Hello Preact");
    }

    try {
        const root = doc.getElementById("root") as unknown as Element;

        // Act
        render(h(TestComponent, null), root);

        // Assert
        const entries = CoreLogger.getRingBuffer().getEntries();
        const mounted = entries.find((e) => e.message.includes("Component mounted/diffed: <TestComponent>"));
        assertNotEquals(mounted, undefined);
    } finally {
        preactSub.uninstall();
        cleanup();
    }
});

Deno.test("unit: CoreLogger: installPreactHooks records component destruction telemetry upon unmount", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const { doc, cleanup } = setupTestDom({
        html: '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
    });

    const logger = createLogger("TestUI");
    const preactSub = installPreactHooks(logger);

    function TestComponent() {
        return h("div", { class: "test-box" }, "Hello Preact");
    }

    try {
        const root = doc.getElementById("root") as unknown as Element;
        render(h(TestComponent, null), root);

        // Act
        render(null, root);

        // Assert
        const entries = CoreLogger.getRingBuffer().getEntries();
        const destroyed = entries.find((e) => e.message.includes("Component destroyed: <TestComponent>"));
        assertNotEquals(destroyed, undefined);
    } finally {
        preactSub.uninstall();
        cleanup();
    }
});

Deno.test("unit: CoreLogger: installConsoleApi binds API handle to window target object", () => {
    // Arrange
    const fakeWin: Record<string, unknown> = {};

    // Act
    const api = installConsoleApi(fakeWin);

    // Assert
    assertEquals(fakeWin.__AI_CHAT_UI__, api);
});

Deno.test("unit: CoreLogger: installConsoleApi dynamic setLogLevel filters lower level logs", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const fakeWin: Record<string, unknown> = {};
    const api = installConsoleApi(fakeWin);
    const logger = createLogger("ApiFilterTest");

    // Act
    api?.setLogLevel("WARN");
    logger.debug("Filtered out debug message");

    // Assert: debug message was filtered out
    const entries = api?.logs.getEntries() ?? [];
    assertEquals(entries.some((e) => e.message === "Filtered out debug message"), false);
});

Deno.test("unit: CoreLogger: installConsoleApi dynamic setRunlevel updates active runlevel", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const fakeWin: Record<string, unknown> = {};
    const api = installConsoleApi(fakeWin);

    // Act
    api?.setRunlevel("prod");

    // Assert
    assertEquals(CoreLogger.getRunlevelManager().getRunlevel(), "prod");
});

Deno.test("unit: CoreLogger: child scope creates nested category hierarchy and records entry", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const parent = createLogger("Parent");
    const child = parent.child("Child").child("Grandchild");

    // Act
    child.info("Nested message");

    // Assert
    const entry = CoreLogger.getRingBuffer().getEntries().find((e) => e.message === "Nested message");
    assertEquals(entry?.scope, "Parent > Child > Grandchild");
});

Deno.test("unit: CoreLogger: resetForTesting flushes LogTape sinks and ring buffer cleanly", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const logger = createLogger("FlushTest");
    logger.info("Message before reset");

    // Act
    CoreLogger.resetForTesting("prod");

    // Assert
    assertEquals(CoreLogger.getRingBuffer().size, 0);
});

Deno.test("unit: CoreLogger: sink exception does not disrupt logging execution", () => {
    // Arrange
    CoreLogger.resetForTesting("dev");
    const unsubscribe = CoreLogger.addSink(() => {
        throw new Error("Faulty sink error");
    });

    try {
        const logger = createLogger("FaultTolerance");

        // Act
        logger.info("Message through faulty sink");

        // Assert
        const entry = CoreLogger.getRingBuffer().getEntries().find((e) => e.message === "Message through faulty sink");
        assertEquals(entry?.message, "Message through faulty sink");
    } finally {
        unsubscribe();
    }
});
