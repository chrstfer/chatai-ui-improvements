import type { SiteAdapter } from "../core/contracts/index.ts";
import { type ChatAdapterRegistry, defaultChatRegistry } from "../chat/registry.ts";
import { __BUILD_VERSION__, __DEV__ } from "../env.ts";
import {
    createLogger,
    installBrowserHooks,
    installConsoleApi,
    installPreactHooks,
    type WindowTarget,
} from "../core/logging/index.ts";

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

    const logger = createLogger("Bootloader");
    logger.info(`Booting extension (${__BUILD_VERSION__}) on ${url}`);

    const browserSub = installBrowserHooks(logger, win as WindowTarget);
    const preactSub = installPreactHooks(logger);
    installConsoleApi(win);

    const adapter = await registry.findAndLoad(url);
    if (!adapter) {
        logger.warn(`Failed to resolve or load adapter for ${url}`);
        browserSub.uninstall();
        preactSub.uninstall();
        delete win[EXPANDO_GUARD];
        return { initialized: false, reason: "no_matching_adapter" };
    }

    logger.info(`Activated site adapter: ${adapter.name} (${adapter.id})`);

    onDOMReady(doc, () => {
        logger.debug("DOM ready, initializing adapter");
        adapter.initialize();
    });

    const cleanup = () => {
        logger.info(`Tearing down adapter (${adapter.id}) on pagehide`);
        adapter.destroy();
        browserSub.uninstall();
        preactSub.uninstall();
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
