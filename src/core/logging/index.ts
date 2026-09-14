/**
 * Scoped telemetry, runtime logging, ring buffering, and browser diagnostics.
 */

export { type LogEntry, type Logger, LogLevel, type LogSink, type Runlevel } from "./types.ts";

export { RunlevelManager } from "./runlevel.ts";
export { LogRingBuffer } from "./ringBuffer.ts";
export { CoreLogger, createLogger } from "./logger.ts";

export {
    type BrowserHooksSubscription,
    installBrowserHooks,
    isExtensionError,
    type WindowTarget,
} from "./browserHooks.ts";

export { installPreactHooks, type PreactHooksSubscription } from "./preactHooks.ts";

export { type AIChatUIConsoleAPI, installConsoleApi } from "./consoleApi.ts";
