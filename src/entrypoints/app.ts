import type { SiteAdapter } from "../core/contracts/index.ts";
import { type ChatAdapterRegistry, defaultChatRegistry } from "../chat/registry.ts";
import { __BUILD_VERSION__, __DEV__ } from "../env.ts";

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

const EXPANDO_GUARD = "__AI_CHAT_UI_LOADED__";

function onDOMReady(doc: DocumentLike, fn: () => void): void {
    if (doc.readyState === "interactive" || doc.readyState === "complete") {
        fn();
    } else {
        doc.addEventListener("DOMContentLoaded", () => fn(), { once: true });
    }
}

export async function bootstrapContentScript(options: BootstrapOptions = {}): Promise<BootstrapResult> {
    const win = options.win ?? (typeof window !== "undefined" ? (window as unknown as WindowLike) : undefined);
    const doc = options.doc ?? (typeof document !== "undefined" ? (document as unknown as DocumentLike) : undefined);
    const registry = options.registry ?? defaultChatRegistry;

    if (!win || !doc) {
        return { initialized: false, reason: "no_matching_adapter" };
    }

    if (win[EXPANDO_GUARD]) {
        return { initialized: false, reason: "already_initialized" };
    }

    const url = options.currentUrl ?? win.location.href;
    if (!registry.hasMatching(url)) {
        return { initialized: false, reason: "no_matching_adapter" };
    }

    win[EXPANDO_GUARD] = true;

    if (__DEV__) {
        console.log(`[AI Chat UI] Booting extension (${__BUILD_VERSION__}) on ${url}`);
    }

    const adapter = await registry.findAndLoad(url);
    if (!adapter) {
        delete win[EXPANDO_GUARD];
        return { initialized: false, reason: "no_matching_adapter" };
    }

    onDOMReady(doc, () => {
        adapter.initialize();
    });

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

if (typeof window !== "undefined" && typeof document !== "undefined") {
    bootstrapContentScript();
}
