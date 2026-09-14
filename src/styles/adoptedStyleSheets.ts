/**
 * Stylesheet Manager and Cache.
 * Provides pre-parsed CSSStyleSheet singletons adopted by open Shadow Roots.
 * 100% synchronous in-memory with zero network requests and 0ms hydration overhead.
 */

import { TAILWIND_CSS } from "./tailwind.generated.ts";
import { KATEX_CSS } from "./katex.generated.ts";

declare const browser: {
    runtime?: {
        getURL?: (path: string) => string;
    };
} | undefined;

export class StyleSheetManager {
    private sharedTailwindSheet: CSSStyleSheet | null = null;
    private sharedKatexSheet: CSSStyleSheet | null = null;
    private hostStyleSheets = new Map<string, CSSStyleSheet>();
    private hostThemeRegistry = new Map<string, string>();

    /**
     * Registers optional host-specific CSS strings (e.g. custom theme tokens or host overrides).
     */
    public registerHostTheme(host: string, cssText: string): void {
        this.hostThemeRegistry.set(host, cssText);
        this.hostStyleSheets.delete(host);
    }

    /**
     * Returns a cached list of pre-parsed CSSStyleSheet singletons to be adopted by open Shadow Roots.
     */
    public getAdoptedStyleSheets(host?: string): CSSStyleSheet[] {
        if (typeof CSSStyleSheet === "undefined") {
            return [];
        }

        if (!this.sharedTailwindSheet) {
            this.sharedTailwindSheet = new CSSStyleSheet();
            try {
                this.sharedTailwindSheet.replaceSync(TAILWIND_CSS);
            } catch (err) {
                console.warn("[AdoptedStyleSheets] Failed to parse inlined Tailwind CSS:", err);
            }
        }

        const sheets: CSSStyleSheet[] = [this.sharedTailwindSheet];

        if (host && this.hostThemeRegistry.has(host)) {
            let hostSheet = this.hostStyleSheets.get(host);
            if (!hostSheet) {
                hostSheet = new CSSStyleSheet();
                try {
                    hostSheet.replaceSync(this.hostThemeRegistry.get(host)!);
                    this.hostStyleSheets.set(host, hostSheet);
                } catch (err) {
                    console.warn(`[AdoptedStyleSheets] Failed to parse host theme CSS for "${host}":`, err);
                }
            }
            if (hostSheet) {
                sheets.push(hostSheet);
            }
        }

        return sheets;
    }

    /**
     * Returns a cached CSSStyleSheet singleton containing inlined KaTeX CSS.
     */
    public getKatexStyleSheet(): CSSStyleSheet | null {
        if (typeof CSSStyleSheet === "undefined") {
            return null;
        }

        if (!this.sharedKatexSheet) {
            this.sharedKatexSheet = new CSSStyleSheet();
            try {
                const fontBase = typeof browser !== "undefined" && browser?.runtime?.getURL
                    ? browser.runtime.getURL("vendor/fonts")
                    : "vendor/fonts";
                const resolvedCss = KATEX_CSS.replaceAll("__KATEX_FONTS_ROOT__", fontBase);
                this.sharedKatexSheet.replaceSync(resolvedCss);
            } catch (err) {
                console.warn("[AdoptedStyleSheets] Failed to parse inlined KaTeX CSS:", err);
            }
        }

        return this.sharedKatexSheet;
    }

    /**
     * Clears all cached stylesheets and theme registrations.
     */
    public clear(): void {
        this.sharedTailwindSheet = null;
        this.sharedKatexSheet = null;
        this.hostStyleSheets.clear();
        this.hostThemeRegistry.clear();
    }
}

export const defaultStyleSheetManager = new StyleSheetManager();

export function registerHostTheme(host: string, cssText: string): void {
    defaultStyleSheetManager.registerHostTheme(host, cssText);
}

export function getAdoptedStyleSheets(host?: string): CSSStyleSheet[] {
    return defaultStyleSheetManager.getAdoptedStyleSheets(host);
}

export function getKatexStyleSheet(): CSSStyleSheet | null {
    return defaultStyleSheetManager.getKatexStyleSheet();
}
