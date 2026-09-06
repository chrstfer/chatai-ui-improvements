import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
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
} from "../src/core/logging/index.ts";

Deno.test("RunlevelManager: Defaults based on runlevel and filters levels accurately", () => {
    const devMgr = new RunlevelManager("dev");
    assertEquals(devMgr.getRunlevel(), "dev");
    assertEquals(devMgr.getEffectiveLogLevel(), LogLevel.DEBUG);
    assertEquals(devMgr.isLevelEnabled(LogLevel.DEBUG), true);
    assertEquals(devMgr.isLevelEnabled(LogLevel.INFO), true);
    assertEquals(devMgr.isLevelEnabled(LogLevel.WARN), true);
    assertEquals(devMgr.isLevelEnabled(LogLevel.ERROR), true);

    const testMgr = new RunlevelManager("test");
    assertEquals(testMgr.getRunlevel(), "test");
    assertEquals(testMgr.getEffectiveLogLevel(), LogLevel.WARN);
    assertEquals(testMgr.isLevelEnabled(LogLevel.DEBUG), false);
    assertEquals(testMgr.isLevelEnabled(LogLevel.INFO), false);
    assertEquals(testMgr.isLevelEnabled(LogLevel.WARN), true);
    assertEquals(testMgr.isLevelEnabled(LogLevel.ERROR), true);

    const prodMgr = new RunlevelManager("prod");
    assertEquals(prodMgr.getRunlevel(), "prod");
    assertEquals(prodMgr.getEffectiveLogLevel(), LogLevel.WARN);
    assertEquals(prodMgr.isLevelEnabled(LogLevel.DEBUG), false);

    // Dynamic override
    prodMgr.setLogLevel(LogLevel.DEBUG);
    assertEquals(prodMgr.getEffectiveLogLevel(), LogLevel.DEBUG);
    assertEquals(prodMgr.isLevelEnabled(LogLevel.DEBUG), true);

    prodMgr.setLogLevel(null);
    assertEquals(prodMgr.getEffectiveLogLevel(), LogLevel.WARN);
});

Deno.test("LogRingBuffer: Rotates entries when capacity is reached", () => {
    const buffer = new LogRingBuffer(3);
    assertEquals(buffer.size, 0);

    buffer.push({ timestamp: 1, level: LogLevel.INFO, scope: "Test", message: "msg 1" });
    buffer.push({ timestamp: 2, level: LogLevel.INFO, scope: "Test", message: "msg 2" });
    buffer.push({ timestamp: 3, level: LogLevel.INFO, scope: "Test", message: "msg 3" });
    assertEquals(buffer.size, 3);
    assertEquals(buffer.getEntries().map((e) => e.message), ["msg 1", "msg 2", "msg 3"]);

    // Exceed capacity
    buffer.push({ timestamp: 4, level: LogLevel.INFO, scope: "Test", message: "msg 4" });
    assertEquals(buffer.size, 3);
    assertEquals(buffer.getEntries().map((e) => e.message), ["msg 2", "msg 3", "msg 4"]);

    buffer.clear();
    assertEquals(buffer.size, 0);
    assertEquals(buffer.getEntries().length, 0);
});

Deno.test("CoreLogger: Formats scopes, supports children, and notifies custom sinks", () => {
    CoreLogger.resetForTesting("dev");

    const captured: string[] = [];
    const unsubscribe = CoreLogger.addSink((entry) => {
        captured.push(`${entry.scope}: ${entry.message}`);
    });

    const rootLogger = createLogger("Adapter");
    const childLogger = rootLogger.child("Scraper");

    assertEquals(rootLogger.scope, "Adapter");
    assertEquals(childLogger.scope, "Adapter > Scraper");

    rootLogger.info("Root initialized");
    childLogger.debug("Scanning elements");

    assertEquals(captured.length, 2);
    assertEquals(captured[0], "Adapter: Root initialized");
    assertEquals(captured[1], "Adapter > Scraper: Scanning elements");

    // Ring buffer check
    const ringEntries = CoreLogger.getRingBuffer().getEntries();
    assertEquals(ringEntries.length, 2);
    assertEquals(ringEntries[1].scope, "Adapter > Scraper");

    unsubscribe();
    rootLogger.info("After unsubscribe");
    assertEquals(captured.length, 2, "Sink should not be called after unsubscribe");
});

Deno.test("isExtensionError: Correctly distinguishes extension errors from host errors", () => {
    // 1. Host SPA error (e.g. Gemini angular error)
    const hostError = {
        filename: "https://www.gstatic.com/chat/app.js",
        message: "NetworkError when attempting to fetch resource",
        error: new Error("Failed to fetch analytics"),
    };
    assertEquals(isExtensionError(hostError), false);

    // 2. Extension error by filename
    const extErrorFilename = {
        filename: "moz-extension://1234-uuid/dist/dev/gemini-chunk.js",
        message: "ReferenceError: foo is not defined",
        error: new Error("ReferenceError: foo is not defined"),
    };
    assertEquals(isExtensionError(extErrorFilename), true);

    // 3. Extension error by stack frame
    const extErrorStack = {
        message: "TypeError: null is not an object",
        error: {
            stack: "TypeError: null is not an object\n    at inject (dist/dev/app.js:12:34)",
        },
    };
    assertEquals(isExtensionError(extErrorStack), true);
});

Deno.test("installBrowserHooks: Dispatches errors to logger with origin filtering", () => {
    CoreLogger.resetForTesting("dev");

    const events = new Map<string, (ev: unknown) => void>();
    const fakeWin = {
        addEventListener: (event: string, handler: (ev: unknown) => void) => {
            events.set(event, handler);
        },
        removeEventListener: (event: string) => {
            events.delete(event);
        },
    };

    const logger = createLogger("TestBoot");
    const sub = installBrowserHooks(logger, fakeWin);

    assertEquals(events.has("error"), true);
    assertEquals(events.has("unhandledrejection"), true);
    assertEquals(events.has("DOMContentLoaded"), true);
    assertEquals(events.has("pagehide"), true);

    // Simulate host error
    const errorHandler = events.get("error")!;
    errorHandler({
        filename: "https://gemini.google.com/_/main.js",
        message: "ChunkLoadError",
        lineno: 10,
    });

    // Verify host error is logged at DEBUG with [Host Error]
    let ring = CoreLogger.getRingBuffer().getEntries();
    assertEquals(ring.length, 1);
    assertEquals(ring[0].level, LogLevel.DEBUG);
    assertEquals(ring[0].message.includes("[Host Error]"), true);

    // Simulate extension error
    errorHandler({
        filename: "chrome-extension://xyz/content.js",
        message: "Extension runtime error",
        lineno: 42,
    });

    ring = CoreLogger.getRingBuffer().getEntries();
    assertEquals(ring.length, 2);
    assertEquals(ring[1].level, LogLevel.ERROR);
    assertEquals(ring[1].message.includes("Unhandled extension error"), true);

    sub.uninstall();
    assertEquals(events.size, 0);
});

Deno.test("installPreactHooks: Captures component instantiation, diffing/timing, and unmount", () => {
    CoreLogger.resetForTesting("dev");

    const doc = new DOMParser().parseFromString(
        '<!DOCTYPE html><html><body><div id="root"></div></body></html>',
        "text/html",
    );
    if (!doc) throw new Error("DOMParser failed");

    interface GlobalDomScope {
        document?: unknown;
        Node?: unknown;
    }
    const globalScope = globalThis as unknown as GlobalDomScope;

    // Provide DOM environment for Preact render
    const origDoc = globalScope.document;
    const origNode = globalScope.Node;
    globalScope.document = doc;
    globalScope.Node = doc.body.constructor;

    const logger = createLogger("TestUI");
    const preactSub = installPreactHooks(logger);

    function TestComponent() {
        return h("div", { class: "test-box" }, "Hello Preact");
    }

    const root = doc.getElementById("root") as unknown as Element;
    render(h(TestComponent, null), root);

    const entriesAfterMount = CoreLogger.getRingBuffer().getEntries();
    const instantiated = entriesAfterMount.find((e) => e.message.includes("Component instantiated: <TestComponent>"));
    const mounted = entriesAfterMount.find((e) => e.message.includes("Component mounted/diffed: <TestComponent>"));

    assertNotEquals(instantiated, undefined, "Should log component instantiation");
    assertNotEquals(mounted, undefined, "Should log component mount with timing");
    assertNotEquals(mounted?.durationMs, undefined, "Duration should be recorded");

    // Test unmounting
    render(null, root);

    const entriesAfterUnmount = CoreLogger.getRingBuffer().getEntries();
    const destroyed = entriesAfterUnmount.find((e) => e.message.includes("Component destroyed: <TestComponent>"));
    assertNotEquals(destroyed, undefined, "Should log component destruction");

    preactSub.uninstall();

    // Restore globals
    globalScope.document = origDoc;
    globalScope.Node = origNode;
});

Deno.test("installConsoleApi: Attaches window.__AI_CHAT_UI__ and allows dynamic control", () => {
    CoreLogger.resetForTesting("dev");

    const fakeWin: Record<string, unknown> = {};
    const api = installConsoleApi(fakeWin);
    assertNotEquals(api, null);
    assertEquals(fakeWin.__AI_CHAT_UI__, api);

    const logger = createLogger("ApiTest");
    logger.info("Sample message");

    assertEquals(api!.logs.getEntries().length, 1);

    // Test log level change via API
    api!.setLogLevel("WARN");
    assertEquals(CoreLogger.getRunlevelManager().getEffectiveLogLevel(), LogLevel.WARN);

    // Now debug logs are filtered out
    logger.debug("Should be filtered out");
    assertEquals(api!.logs.getEntries().length, 1);

    // Clear buffer via API
    api!.logs.clear();
    assertEquals(api!.logs.getEntries().length, 0);

    // Set runlevel via API
    api!.setRunlevel("prod");
    assertEquals(CoreLogger.getRunlevelManager().getRunlevel(), "prod");
});
