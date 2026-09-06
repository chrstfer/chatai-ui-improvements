import type { HostThemeAuthority, ThemeChangeCallback, ThemeMode } from "../../core/contracts/index.ts";
import { GEMINI_SELECTORS } from "./selectors.ts";

export class GeminiThemeAuthority implements HostThemeAuthority {
    public readonly supportsTheming = true;
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
        this.observer = new MutationObserver(() => {
            const active = this.getTheme() === "dark" ? "dark" : "light";
            for (const listener of this.themeListeners) {
                listener(active);
            }
        });
        this.observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    public destroy(): void {
        this.observer?.disconnect();
        this.themeListeners.clear();
    }
}
