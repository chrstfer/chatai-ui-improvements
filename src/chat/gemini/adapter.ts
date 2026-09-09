import type { SiteAdapter } from "../../core/contracts/index.ts";
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

    private logger = createLogger("Gemini");
    private domObserver: GeminiDOMObserver | null = null;
    private injector: GeminiInjector;
    private layoutController: GeminiLayoutController;
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

    public destroy(): void {
        this.logger.info("Destroying Gemini adapter and disconnecting observers");
        this.storeUnsubscribe?.();
        this.storeUnsubscribe = null;
        this.themeUnsubscribe?.();
        this.themeUnsubscribe = null;
        this.hudHandle?.unmount();
        this.hudHandle = null;
        this.layoutController.destroy();
        this.domObserver?.disconnect();
        this.domObserver = null;
        this.injector.destroyAll();
        this.themeAuthority.destroy();
    }
}
