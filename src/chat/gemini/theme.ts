import type { HostThemeAuthority, ThemeChangeCallback, ThemeMode } from "../../core/contracts/index.ts";
import { GEMINI_SELECTORS } from "./selectors.ts";
import { createLogger } from "../../core/logging/index.ts";

export class GeminiThemeAuthority implements HostThemeAuthority {
    public readonly supportsTheming = true;
    private logger = createLogger("Gemini > Theme");
    private themeListeners = new Set<ThemeChangeCallback>();
    private observer: MutationObserver | null = null;

    constructor() {
        this.initObserver();
    }

    public getTheme(): ThemeMode {
        if (typeof document === "undefined") return "auto";
        const isDark = document.body?.classList.contains(GEMINI_SELECTORS.DARK_THEME_CLASS) ||
            document.documentElement?.getAttribute("data-theme") === "dark";
        return isDark ? "dark" : "light";
    }

    public onThemeChange(callback: ThemeChangeCallback): () => void {
        this.themeListeners.add(callback);
        return () => this.themeListeners.delete(callback);
    }

    private initObserver(): void {
        if (typeof document === "undefined" || !document.body) return;
        this.logger.debug(`Initialized theme observer, initial mode detected: "${this.getTheme()}"`);
        this.observer = new MutationObserver(() => {
            const active = this.getTheme() === "dark" ? "dark" : "light";
            this.logger.debug(
                `Detected DOM theme class mutation, dispatching "${active}" to ${this.themeListeners.size} listener(s)`,
            );
            for (const listener of this.themeListeners) {
                listener(active);
            }
        });
        this.observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    public destroy(): void {
        this.logger.debug("Disconnected theme observer");
        this.observer?.disconnect();
        this.themeListeners.clear();
    }
}
