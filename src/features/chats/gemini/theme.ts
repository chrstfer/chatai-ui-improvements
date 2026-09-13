import type { HostThemeAuthority, ThemeChangeCallback, ThemeMode } from "../../../contracts/chats/index.ts";
import { GEMINI_SELECTORS } from "./selectors.ts";
import { createLogger } from "../../../core/logging/index.ts";

export class GeminiThemeAuthority implements HostThemeAuthority {
    public readonly supportsTheming = true;
    private logger = createLogger("Gemini > Theme");
    private themeListeners = new Set<ThemeChangeCallback>();
    private observer: MutationObserver | null = null;

    private mediaQuery: MediaQueryList | null = null;
    private mediaListener: (() => void) | null = null;

    constructor() {
        this.initObserver();
    }

    public getTheme(): ThemeMode {
        if (typeof document === "undefined") return "auto";
        if (
            document.body?.classList.contains(GEMINI_SELECTORS.DARK_THEME_CLASS) ||
            document.documentElement?.getAttribute("data-theme") === "dark"
        ) {
            return "dark";
        }
        if (
            document.body?.classList.contains("light-theme") ||
            document.documentElement?.getAttribute("data-theme") === "light"
        ) {
            return "light";
        }
        if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
            return "dark";
        }
        return "light";
    }

    public onThemeChange(callback: ThemeChangeCallback): () => void {
        this.themeListeners.add(callback);
        return () => this.themeListeners.delete(callback);
    }

    private initObserver(): void {
        if (typeof document === "undefined") return;
        this.logger.debug(`Initialized theme observer, initial mode detected: "${this.getTheme()}"`);

        const notify = () => {
            const active = this.getTheme() === "dark" ? "dark" : "light";
            this.logger.debug(
                `Theme change detected, dispatching "${active}" to ${this.themeListeners.size} listener(s)`,
            );
            for (const listener of this.themeListeners) {
                listener(active);
            }
        };

        if (document.body && typeof MutationObserver !== "undefined") {
            this.observer = new MutationObserver(notify);
            this.observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
        }

        if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
            this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            this.mediaListener = notify;
            this.mediaQuery.addEventListener?.("change", this.mediaListener);
        }
    }

    public destroy(): void {
        this.logger.debug("Disconnected theme observer");
        this.observer?.disconnect();
        if (this.mediaQuery && this.mediaListener) {
            this.mediaQuery.removeEventListener?.("change", this.mediaListener);
            this.mediaQuery = null;
            this.mediaListener = null;
        }
        this.themeListeners.clear();
    }
}
