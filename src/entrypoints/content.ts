import type { SiteAdapter } from "../core/contracts/index.ts";
import { type ChatAdapterRegistry, defaultChatRegistry } from "../chat/registry.ts";

export interface WindowLike {
    location: { href: string };
    addEventListener(event: string, handler: (event?: unknown) => void, options?: unknown): void;
    removeEventListener?(event: string, handler: (event?: unknown) => void): void;
    [key: string]: unknown;
}

export interface DocumentLike {
    readyState: string;
    addEventListener(event: string, handler: (event?: unknown) => void, options?: unknown): void;
    [key: string]: unknown;
}

export interface BootstrapOptions {
    registry?: ChatAdapterRegistry;
    currentUrl?: URL | string;
    win?: WindowLike;
    doc?: DocumentLike;
}

export interface BootstrapResult {
    initialized: boolean;
    adapter?: SiteAdapter;
    reason?: "already_initialized" | "no_matching_adapter" | "success";
}

/** Global symbol used to prevent duplicate script execution */
const EXPANDO_GUARD = "__AI_CHAT_UI_LOADED__";

/**
 * Evaluates DOM readiness and invokes callback when the DOM is interactive or complete.
 */
function onDOMReady(doc: DocumentLike, fn: () => void): void {
    if (doc.readyState === "interactive" || doc.readyState === "complete") {
        fn();
    } else {
        doc.addEventListener("DOMContentLoaded", () => fn(), { once: true });
    }
}

/**
 * Pure bootstrap function managing adapter discovery, single-mount guard,
 * DOM-ready sequencing, and teardown registration.
 */
export function bootstrapContentScript(options: BootstrapOptions = {}): BootstrapResult {
    const win = options.win ?? (typeof window !== "undefined" ? (window as unknown as WindowLike) : undefined);
    const doc = options.doc ?? (typeof document !== "undefined" ? (document as unknown as DocumentLike) : undefined);
    const registry = options.registry ?? defaultChatRegistry;

    if (!win || !doc) {
        return { initialized: false, reason: "no_matching_adapter" };
    }

    // Idempotency guard: prevent duplicate runs in the same browsing context
    if (win[EXPANDO_GUARD]) {
        return { initialized: false, reason: "already_initialized" };
    }

    const url = options.currentUrl ?? win.location.href;
    const adapter = registry.findMatching(url);

    if (!adapter) {
        return { initialized: false, reason: "no_matching_adapter" };
    }

    // Tag window to mark script loaded
    win[EXPANDO_GUARD] = true;

    // Initialize once DOM is ready (handles run_at: "document_start")
    onDOMReady(doc, () => {
        adapter.initialize();
    });

    // Register teardown on page navigation/unload
    const cleanup = () => {
        adapter.destroy();
        delete win[EXPANDO_GUARD];
    };

    win.addEventListener("pagehide", cleanup, { once: true });

    return {
        initialized: true,
        adapter,
        reason: "success",
    };
}

// Auto-execute when running directly in browser context
if (typeof window !== "undefined" && typeof document !== "undefined") {
    bootstrapContentScript();
}
