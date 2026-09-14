import type { HostThemeAuthority, ThemeChangeCallback, ThemeMode } from "../../../contracts/chats/index.ts";
import { DUCKAI_SELECTORS } from "./selectors.ts";
import { createLogger } from "../../../core/logging/index.ts";

/**
 * Host Theme Authority for DuckDuckGo AI (duck.ai).
 * Cascades theme detection across documentElement attributes (data-theme, data-color-mode),
 * body class markers, and prefers-color-scheme media queries.
 */
export class DuckAiThemeAuthority implements HostThemeAuthority {
    public readonly supportsTheming = true;
    private logger = createLogger("DuckAI > Theme");
    private themeListeners = new Set<ThemeChangeCallback>();
    private observer: MutationObserver | null = null;

    private mediaQuery: MediaQueryList | null = null;
    private mediaListener: (() => void) | null = null;

    constructor() {
        this.initObserver();
    }

    /**
     * Resolves the current theme mode strictly via cascading host authority.
     */
    public getTheme(): ThemeMode {
        if (typeof document === "undefined") return "auto";

        const docEl = document.documentElement;
        const themeAttr = docEl?.getAttribute(DUCKAI_SELECTORS.THEME_ATTR) ?? docEl?.getAttribute("data-color-mode");

        if (themeAttr === "dark" || document.body?.classList.contains("dark")) {
            return "dark";
        }
        if (themeAttr === "light" || document.body?.classList.contains("light")) {
            return "light";
        }

        // Fall back to system preference
        if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
            return "dark";
        }
        return "light";
    }

    /**
     * Registers a callback invoked whenever the host theme mutates.
     */
    public onThemeChange(callback: ThemeChangeCallback): () => void {
        this.themeListeners.add(callback);
        return () => this.themeListeners.delete(callback);
    }

    private initObserver(): void {
        if (typeof document === "undefined") return;
        this.logger.debug(`Initialized theme observer, initial mode: "${this.getTheme()}"`);

        const notify = () => {
            const active = this.getTheme() === "dark" ? "dark" : "light";
            this.logger.debug(
                `Host theme change detected, dispatching "${active}" to ${this.themeListeners.size} listener(s)`,
            );
            for (const listener of this.themeListeners) {
                listener(active);
            }
        };

        if (document.documentElement && typeof MutationObserver !== "undefined") {
            this.observer = new MutationObserver(notify);
            this.observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: [DUCKAI_SELECTORS.THEME_ATTR, "data-color-mode", "class"],
            });
        }

        if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
            this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            this.mediaListener = notify;
            this.mediaQuery.addEventListener?.("change", this.mediaListener);
        }
    }

    /**
     * Disconnects DOM mutation observer and media query listeners.
     */
    public destroy(): void {
        this.logger.debug("Disconnected theme observer");
        this.observer?.disconnect();
        this.observer = null;
        if (this.mediaQuery && this.mediaListener) {
            this.mediaQuery.removeEventListener?.("change", this.mediaListener);
            this.mediaQuery = null;
            this.mediaListener = null;
        }
        this.themeListeners.clear();
    }
}
