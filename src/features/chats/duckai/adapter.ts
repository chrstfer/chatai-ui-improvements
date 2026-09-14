import type { ChatColumnBounds, SiteAdapter } from "@internal/contracts/chats";
import type { ExtensionSettings } from "@internal/contracts/core";
import { DUCKAI_SELECTORS } from "./selectors.ts";
import { DuckAiDomObserver } from "./domObserver.ts";
import { DuckAiInjector } from "./injector.tsx";
import { DuckAiScraper } from "./scraper.ts";
import { DuckAiThemeAuthority } from "./theme.ts";
import { DuckAiLayoutController } from "./layout.ts";
import type { DuckAiResponseRef } from "./types.ts";
import { SettingsStore } from "@internal/core/settings";
import { type HudMountHandle, mountHud } from "@internal/views/settings";
import { createLogger } from "@internal/core/logging";

/**
 * Host Site Adapter for DuckDuckGo AI (https://duck.ai/ and https://duckduckgo.com/chat).
 * Implements SiteAdapter contract with autonomous SPA navigation resilience,
 * cascading theme authority, response-centric settlement observation, and HUD mounting.
 */
export class DuckAiSiteAdapter implements SiteAdapter {
    public readonly id = "duckai";
    public readonly name = "DuckDuckGo AI";
    public readonly themeAuthority: DuckAiThemeAuthority;
    public readonly layoutController: DuckAiLayoutController;

    private logger = createLogger("DuckAI");
    private domObserver: DuckAiDomObserver | null = null;
    private injector: DuckAiInjector;
    private scraper: DuckAiScraper;
    private store: SettingsStore;
    private hudHandle: HudMountHandle | null = null;
    private storeUnsubscribe: (() => void) | null = null;
    private themeUnsubscribe: (() => void) | null = null;

    // SPA navigation tracking
    private origPushState: typeof history.pushState | null = null;
    private origReplaceState: typeof history.replaceState | null = null;
    private popstateListener: (() => void) | null = null;
    private currentUrl: string = "";

    constructor(
        options?: {
            store?: SettingsStore;
            layoutController?: DuckAiLayoutController;
            themeAuthority?: DuckAiThemeAuthority;
            injector?: DuckAiInjector;
            scraper?: DuckAiScraper;
        },
    ) {
        this.store = options?.store ?? new SettingsStore();
        this.layoutController = options?.layoutController ?? new DuckAiLayoutController();
        this.themeAuthority = options?.themeAuthority ?? new DuckAiThemeAuthority();
        this.injector = options?.injector ?? new DuckAiInjector();
        this.scraper = options?.scraper ?? new DuckAiScraper();
    }

    public get settings(): ExtensionSettings {
        return this.store.settings;
    }

    public get settingsStore(): SettingsStore {
        return this.store;
    }

    public matches(url: URL): boolean {
        return url.hostname === "duck.ai" ||
            (url.hostname === "duckduckgo.com" && url.pathname.startsWith("/chat"));
    }

    public initialize(): void {
        this.logger.info("Initializing DuckDuckGo AI adapter");

        // Initialize host layout stylesheet & initial width styles
        this.layoutController.initialize();
        this.layoutController.apply(this.store.settings);

        // Asynchronously load settings from local storage and sync with layout
        this.store.load().then(() => {
            this.layoutController.apply(this.store.settings);
        }).catch((err) => {
            this.logger.warn("Failed to load settings from storage", err);
        });

        // React to settings changes
        this.storeUnsubscribe = this.store.subscribe((settings) => {
            this.layoutController.apply(settings);
        });

        // Mount the floating HUD
        const initialTheme = this.themeAuthority.getTheme() === "dark" ? "dark" : "light";
        this.hudHandle = mountHud({
            store: this.store,
            theme: initialTheme,
            host: "duckai",
            getChatColumnBounds: () => this.getChatColumnBounds(),
            onWidthChange: () => {
                this.layoutController.apply(this.store.settings);
            },
        });

        // React to host theme changes
        this.themeUnsubscribe = this.themeAuthority.onThemeChange((theme) => {
            this.logger.info(`Host theme changed to "${theme}"`);
            const mode = theme === "dark" ? "dark" : "light";
            this.injector.updateThemes(mode);
            this.hudHandle?.updateTheme(mode);
        });

        // Initialize response-centric settlement observer
        this.domObserver = new DuckAiDomObserver({
            onResponseDiscovered: (response) => {
                this.logger.debug(`Assistant response discovered: #${response.id}`);
            },
            onResponseStreaming: (response) => {
                this.logger.debug(`Assistant response streaming: #${response.id}`);
            },
            onResponseSettled: (response) => {
                this.handleResponseSettled(response);
            },
            onResponseRemoved: (responseId) => {
                this.logger.debug(`Assistant response removed: #${responseId}`);
            },
        });

        this.startObserving();
        this.installSpaNavigationHooks();
    }

    private startObserving(): void {
        if (typeof document === "undefined" || !this.domObserver) return;

        const viewportEl = document.querySelector<HTMLElement>(DUCKAI_SELECTORS.MAIN_VIEWPORT);
        if (viewportEl) {
            this.logger.debug("Observing main viewport container");
        } else {
            this.logger.warn("Main viewport not found, falling back to document.body");
        }

        const target = viewportEl || document.body;
        if (target) {
            this.domObserver.observe(target);
        }
    }

    private handleResponseSettled(response: DuckAiResponseRef): void {
        this.logger.info(`Assistant response settled: #${response.id}`);
        const theme = this.themeAuthority.getTheme() === "dark" ? "dark" : "light";

        // Query code blocks within this settled response turn
        const codeBlocks = response.element.querySelectorAll<HTMLElement>(DUCKAI_SELECTORS.CODE_BLOCK);
        this.logger.debug(`Discovered ${codeBlocks.length} code-block(s) in settled response #${response.id}`);

        codeBlocks.forEach((el) => {
            const blockRef = this.scraper.parseCodeBlock(el);
            if (blockRef) {
                this.injector.inject(blockRef, theme);
            }
        });
    }

    private installSpaNavigationHooks(): void {
        if (typeof window === "undefined" || typeof history === "undefined") return;

        this.currentUrl = globalThis.location.href;

        // Wrap pushState
        this.origPushState = history.pushState.bind(history);
        history.pushState = (...args: Parameters<typeof history.pushState>) => {
            this.origPushState?.(...args);
            this.checkUrlChange();
        };

        // Wrap replaceState
        this.origReplaceState = history.replaceState.bind(history);
        history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
            this.origReplaceState?.(...args);
            this.checkUrlChange();
        };

        // Listen for popstate and hashchange
        this.popstateListener = () => this.checkUrlChange();
        globalThis.addEventListener("popstate", this.popstateListener);
        globalThis.addEventListener("hashchange", this.popstateListener);
    }

    private checkUrlChange(): void {
        if (typeof window === "undefined") return;
        const newUrl = globalThis.location.href;
        if (newUrl !== this.currentUrl) {
            this.logger.info(`SPA navigation detected: ${this.currentUrl} -> ${newUrl}`);
            this.currentUrl = newUrl;
            this.handleThreadSwitch();
        }
    }

    /**
     * Handles thread navigation: cleans up mounted containers and re-attaches observer.
     */
    public handleThreadSwitch(): void {
        this.logger.info("Handling thread switch: tearing down active roots and re-observing new thread");
        this.injector.destroyAll();
        this.injector.reset();

        if (this.domObserver) {
            this.domObserver.disconnect();
            this.startObserving();
        }
    }

    public getChatColumnBounds(): ChatColumnBounds | null {
        if (typeof document === "undefined") return null;

        let sidebarRight = 0;
        const sidebar = document.querySelector<HTMLElement>(DUCKAI_SELECTORS.SIDEBAR);
        if (sidebar) {
            const r = sidebar.getBoundingClientRect?.();
            if (r && r.width > 0) {
                sidebarRight = Math.round(r.right);
            }
        }

        const viewport = document.querySelector<HTMLElement>(DUCKAI_SELECTORS.MAIN_VIEWPORT);
        let bounds: ChatColumnBounds;

        if (viewport) {
            const rect = viewport.getBoundingClientRect?.();
            if (rect && rect.width > 0 && rect.height > 0) {
                bounds = {
                    left: Math.max(Math.round(rect.left), sidebarRight),
                    right: Math.round(rect.right),
                    top: Math.round(rect.top),
                    bottom: Math.round(rect.bottom),
                };
            } else {
                bounds = {
                    left: sidebarRight,
                    right: typeof globalThis.innerWidth !== "undefined" ? globalThis.innerWidth : 1200,
                    top: 0,
                    bottom: typeof globalThis.innerHeight !== "undefined" ? globalThis.innerHeight : 800,
                };
            }
        } else {
            bounds = {
                left: sidebarRight,
                right: typeof globalThis.innerWidth !== "undefined" ? globalThis.innerWidth : 1200,
                top: 0,
                bottom: typeof globalThis.innerHeight !== "undefined" ? globalThis.innerHeight : 800,
            };
        }

        this.logger.debug(
            `getChatColumnBounds: left=${bounds.left} (sidebarRight=${sidebarRight}), right=${bounds.right}`,
        );
        return bounds;
    }

    public destroy(): void {
        this.logger.info("Destroying DuckDuckGo AI adapter and disconnecting all observers");

        // Restore history hooks
        if (this.origPushState) {
            history.pushState = this.origPushState;
            this.origPushState = null;
        }
        if (this.origReplaceState) {
            history.replaceState = this.origReplaceState;
            this.origReplaceState = null;
        }
        if (this.popstateListener && typeof window !== "undefined") {
            globalThis.removeEventListener("popstate", this.popstateListener);
            globalThis.removeEventListener("hashchange", this.popstateListener);
            this.popstateListener = null;
        }

        if (this.storeUnsubscribe) {
            this.logger.debug("Unsubscribing from settings store");
            this.storeUnsubscribe();
            this.storeUnsubscribe = null;
        }
        if (this.themeUnsubscribe) {
            this.logger.debug("Unsubscribing from theme authority");
            this.themeUnsubscribe();
            this.themeUnsubscribe = null;
        }
        if (this.hudHandle) {
            this.logger.info("Unmounting Floating HUD handle...");
            this.hudHandle.unmount();
            this.hudHandle = null;
        }
        this.logger.info("Destroying layout controller...");
        this.layoutController.destroy();
        if (this.domObserver) {
            this.logger.info("Disconnecting DOM observer...");
            this.domObserver.disconnect();
            this.domObserver = null;
        }
        this.logger.info("Calling injector.destroyAll()...");
        this.injector.destroyAll();
        this.logger.info("Destroying theme authority...");
        this.themeAuthority.destroy();
        this.logger.info("DuckDuckGo AI site adapter destroyed completely");
    }
}
