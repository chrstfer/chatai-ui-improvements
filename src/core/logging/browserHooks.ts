import type { Logger } from "./types.ts";

export interface BrowserHooksSubscription {
    uninstall(): void;
}

export interface WindowTarget {
    addEventListener?(event: string, handler: (event: unknown) => void, options?: unknown): void;
    removeEventListener?(event: string, handler: (event: unknown) => void, options?: unknown): void;
}

declare const browser: {
    runtime?: {
        getURL?: (path: string) => string;
    };
} | undefined;

export function isExtensionError(event: unknown): boolean {
    if (!event || typeof event !== "object") return false;

    const extBase = (typeof browser !== "undefined" && browser?.runtime?.getURL) ? browser.runtime.getURL("") : "";

    const ev = event as { filename?: string; error?: unknown; reason?: unknown };

    if (typeof ev.filename === "string" && ev.filename) {
        if (extBase && ev.filename.startsWith(extBase)) return true;
        if (
            ev.filename.includes("dist/dev") ||
            ev.filename.includes("moz-extension://") ||
            ev.filename.includes("chrome-extension://")
        ) {
            return true;
        }
    }

    const err = ev.error ?? ev.reason;
    if (err && typeof err === "object" && "stack" in err && typeof (err as { stack: unknown }).stack === "string") {
        const stack = (err as { stack: string }).stack;
        if (extBase && stack.includes(extBase)) return true;
        if (
            stack.includes("moz-extension://") ||
            stack.includes("chrome-extension://") ||
            stack.includes("dist/dev")
        ) {
            return true;
        }
    }

    return false;
}

export function installBrowserHooks(
    logger: Logger,
    win?: WindowTarget,
): BrowserHooksSubscription {
    const target = win ?? (typeof window !== "undefined" ? (window as unknown as WindowTarget) : undefined);
    if (!target) {
        return { uninstall: () => {} };
    }

    const browserLogger = logger.child("Browser");

    const errHandler = (event: unknown) => {
        const ev = event as { message?: string; filename?: string; lineno?: number; error?: unknown };
        if (isExtensionError(event)) {
            const loc = ev.filename ? ` (${ev.filename}:${ev.lineno})` : "";
            browserLogger.error(`Unhandled extension error: ${ev.message ?? "unknown"}${loc}`, ev.error);
        } else {
            const loc = ev.filename ? ` (${ev.filename}:${ev.lineno})` : "";
            browserLogger.debug(`[Host Error] ${ev.message ?? "unknown"}${loc}`);
        }
    };

    const rejectionHandler = (event: unknown) => {
        const ev = event as { reason?: unknown };
        if (isExtensionError(event)) {
            browserLogger.error("Unhandled extension promise rejection", ev.reason);
        } else {
            browserLogger.debug("[Host Promise Rejection]", ev.reason);
        }
    };

    const lifecycleHandler = (event: unknown) => {
        const ev = event as { type?: string };
        browserLogger.debug(`Window lifecycle transition: ${ev.type ?? "unknown"}`);
    };

    target.addEventListener?.("error", errHandler, { passive: true });
    target.addEventListener?.("unhandledrejection", rejectionHandler, { passive: true });
    target.addEventListener?.("DOMContentLoaded", lifecycleHandler, { passive: true, once: true });
    target.addEventListener?.("pagehide", lifecycleHandler, { passive: true, once: true });

    return {
        uninstall: () => {
            target.removeEventListener?.("error", errHandler);
            target.removeEventListener?.("unhandledrejection", rejectionHandler);
            target.removeEventListener?.("DOMContentLoaded", lifecycleHandler);
            target.removeEventListener?.("pagehide", lifecycleHandler);
        },
    };
}
