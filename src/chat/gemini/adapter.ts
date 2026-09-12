import type { ChatColumnBounds, SiteAdapter } from "../../core/contracts/index.ts";
import { GEMINI_SELECTORS } from "./selectors.ts";
import { GeminiDOMObserver } from "./domObserver.ts";
import { GeminiInjector } from "./injector.tsx";
import { GeminiThemeAuthority } from "./theme.ts";
import { GeminiLayoutController } from "./layout.ts";
import { type ExtensionSettings, SettingsStore } from "../../core/storage/settings.ts";
import { type HudMountHandle, mountHud } from "../../views/settings/index.ts";
import { createLogger } from "../../core/logging/index.ts";

export class GeminiSiteAdapter implements SiteAdapter {
    public readonly id = "gemini";
    public readonly name = "Google Gemini";
    public readonly themeAuthority: GeminiThemeAuthority;
    public readonly layoutController: GeminiLayoutController;

    private logger = createLogger("Gemini");
    private domObserver: GeminiDOMObserver | null = null;
    private injector: GeminiInjector;
    private store: SettingsStore;
    private hudHandle: HudMountHandle | null = null;
    private storeUnsubscribe: (() => void) | null = null;
    private themeUnsubscribe: (() => void) | null = null;

    constructor(
        options?: {
            store?: SettingsStore;
            layoutController?: GeminiLayoutController;
            themeAuthority?: GeminiThemeAuthority;
            injector?: GeminiInjector;
        },
    ) {
        this.store = options?.store ?? new SettingsStore();
        this.layoutController = options?.layoutController ?? new GeminiLayoutController();
        this.themeAuthority = options?.themeAuthority ?? new GeminiThemeAuthority();
        this.injector = options?.injector ?? new GeminiInjector();
    }

    public get settings(): ExtensionSettings {
        return this.store.settings;
    }

    public get settingsStore(): SettingsStore {
        return this.store;
    }

    public matches(url: URL): boolean {
        return url.hostname === "gemini.google.com";
    }

    public initialize(): void {
        this.logger.info("Initializing Gemini adapter");

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
            host: "gemini",
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

        this.domObserver = new GeminiDOMObserver({
            onBlockDiscovered: (block) => {
                this.logger.debug(`Code block discovered: #${block.id} (hint: "${block.languageHint}")`);
            },
            onBlockStreaming: (block) => {
                this.logger.debug(`Code block streaming update: #${block.id}`);
            },
            onBlockSettled: (block) => {
                this.logger.info(
                    `Code block settled: #${block.id} (hint: "${block.languageHint}", ${block.rawText.length} chars)`,
                );
                const theme = this.themeAuthority.getTheme() === "dark" ? "dark" : "light";
                this.injector.inject(block, theme);
            },
        });

        if (typeof document !== "undefined") {
            const scrollerEl = document.querySelector(GEMINI_SELECTORS.SCROLLER);
            if (scrollerEl) {
                this.logger.debug("Observing scroller container: " + GEMINI_SELECTORS.SCROLLER);
            } else {
                this.logger.warn("Scroller container not found, falling back to document.body");
            }

            const scroller = scrollerEl || document.body;
            if (scroller) {
                this.domObserver.observe(scroller);
            }
        }
    }

    public getChatColumnBounds(): ChatColumnBounds | null {
        if (typeof document === "undefined") return null;

        // In Gemini, bard-sidenav is the dedicated left drawer and bard-sidenav-content is the chat area.
        let sidebarRight = 0;
        const sidebar = document.querySelector<HTMLElement>(GEMINI_SELECTORS.SIDENAV);
        if (sidebar) {
            const r = sidebar.getBoundingClientRect?.();
            if (r && r.width > 0) {
                sidebarRight = Math.round(r.right);
            }
        }

        const container = document.querySelector<HTMLElement>(
            `${GEMINI_SELECTORS.SIDENAV_CONTENT}, .conversation-container`,
        );
        let bounds: ChatColumnBounds;
        if (container) {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
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
        this.logger.info("Destroying Gemini adapter and disconnecting all observers");
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
        this.logger.info("Gemini site adapter destroyed completely");
    }
}
