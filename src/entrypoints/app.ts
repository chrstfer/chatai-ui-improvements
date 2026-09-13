import type { SiteAdapter } from "../contracts/chats/index.ts";
import { type ChatAdapterRegistry, defaultChatRegistry } from "../registries/index.ts";
import { defaultTabStateBridge, type TabStateBridge } from "../core/rpc/index.ts";
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
    bridge?: TabStateBridge;
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
    const bridge = options.bridge ?? defaultTabStateBridge;

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

    const isTabActive = await bridge.getInitialState();

    let activeAdapter: SiteAdapter | null = null;
    let isDOMReady = false;

    const startAdapter = async () => {
        logger.info(`startAdapter called (activeAdapter currently exists: ${!!activeAdapter})`);
        if (activeAdapter) return;
        logger.info(`Requesting fresh adapter instance for ${url} from registry...`);
        const loaded = await registry.findAndLoad(url, { fresh: true });
        if (!loaded) {
            logger.error(`Failed to load fresh adapter for ${url}`);
            return;
        }
        activeAdapter = loaded;
        logger.info(`Fresh adapter loaded: ${activeAdapter.name} (id: ${activeAdapter.id}), isDOMReady: ${isDOMReady}`);
        if (isDOMReady) {
            logger.info(`DOM ready, initializing site adapter: ${activeAdapter.name}`);
            activeAdapter.initialize();
            logger.info(`Site adapter ${activeAdapter.name} initialized successfully`);
        }
    };

    const stopAdapter = () => {
        logger.info(`stopAdapter called (activeAdapter currently exists: ${!!activeAdapter})`);
        if (!activeAdapter) return;
        const id = activeAdapter.id;
        const name = activeAdapter.name;
        logger.info(`Invoking destroy on site adapter: ${name} (${id})`);
        activeAdapter.destroy();
        activeAdapter = null;
        logger.info(`Unloading adapter id ${id} from registry...`);
        const unloaded = registry.unload?.(id);
        logger.info(`Adapter ${name} destroyed and unloaded (unloaded: ${unloaded})`);
    };

    if (isTabActive) {
        logger.info(`Initial state active, finding and loading adapter for ${url}`);
        const loaded = await registry.findAndLoad(url);
        if (!loaded) {
            logger.warn(`Failed to resolve or load adapter for ${url}`);
            browserSub.uninstall();
            preactSub.uninstall();
            delete win[EXPANDO_GUARD];
            return { initialized: false, reason: "no_matching_adapter" };
        }
        activeAdapter = loaded;

        logger.info(`Activated site adapter: ${activeAdapter.name} (${activeAdapter.id})`);

        onDOMReady(doc, () => {
            isDOMReady = true;
            if (activeAdapter) {
                logger.debug("DOM ready, initializing adapter");
                activeAdapter.initialize();
            }
        });
    } else {
        logger.info(`Initial state inactive (tab disabled), skipping adapter initialization`);
        onDOMReady(doc, () => {
            isDOMReady = true;
        });
    }

    const unsubToggle = bridge.onToggle(async (enabled) => {
        logger.info(`onToggle listener invoked with enabled = ${enabled}`);
        if (enabled) {
            logger.info("Enabling extension via toolbar action toggle");
            await startAdapter();
        } else {
            logger.info("Disabling extension via toolbar action toggle");
            stopAdapter();
        }
    });

    const cleanup = () => {
        logger.info("Tearing down adapter on pagehide");
        unsubToggle();
        stopAdapter();
        browserSub.uninstall();
        preactSub.uninstall();
        delete win[EXPANDO_GUARD];
    };

    win.addEventListener("pagehide", cleanup, { once: true });

    return {
        initialized: isTabActive,
        adapter: activeAdapter ?? undefined,
        reason: "success",
    };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    bootstrapContentScript();
}
