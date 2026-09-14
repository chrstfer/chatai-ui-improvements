import { CoreLogger, createLogger } from "../../../src/core/logging/index.ts";

const originalConsole = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
};

function silenceConsole() {
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
}

function restoreConsole() {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
}

// 1. Filtered log throughput: testing hot paths where debug logs are discarded
Deno.bench("bench: CoreLogger: filtered log throughput (DEBUG silenced at WARN level)", (b) => {
    CoreLogger.resetForTesting("prod");
    const logger = createLogger("BenchmarkFiltered");
    b.start();
    for (let i = 0; i < 1000; i++) {
        logger.debug("Filtered debug message", { iteration: i, payload: "test-data" });
    }
    b.end();
});

// 2. Active log throughput: testing active logging dispatched to ring buffer and console
Deno.bench("bench: CoreLogger: active log throughput (INFO emitted)", (b) => {
    CoreLogger.resetForTesting("dev");
    silenceConsole();
    const logger = createLogger("BenchmarkActive");
    b.start();
    for (let i = 0; i < 1000; i++) {
        logger.info("Active info log message", { index: i, status: "ok" });
    }
    b.end();
    restoreConsole();
});

// 3. Child logger instantiation: testing scope hierarchy creation
Deno.bench("bench: CoreLogger: child logger instantiation", (b) => {
    const rootLogger = createLogger("BenchmarkRoot");
    b.start();
    for (let i = 0; i < 1000; i++) {
        const child = rootLogger.child(`Child_${i % 10}`);
        const _sub = child.child("Deep");
    }
    b.end();
});

// 4. Active debugWithTiming throughput
Deno.bench("bench: CoreLogger: debugWithTiming throughput", (b) => {
    CoreLogger.resetForTesting("dev");
    silenceConsole();
    const logger = createLogger("BenchmarkTiming");
    b.start();
    for (let i = 0; i < 1000; i++) {
        logger.debugWithTiming("Component diffed", 14.5, { elementCount: 42 });
    }
    b.end();
    restoreConsole();
});
