import { TAILWIND_CSS } from "./tailwind.generated.ts";

let sharedTailwindSheet: CSSStyleSheet | null = null;
const hostStyleSheets = new Map<string, CSSStyleSheet>();
const hostThemeRegistry = new Map<string, string>();

/**
 * Registers optional host-specific CSS strings (e.g. custom theme tokens or host overrides).
 */
export function registerHostTheme(host: string, cssText: string): void {
    hostThemeRegistry.set(host, cssText);
    hostStyleSheets.delete(host);
}

/**
 * Returns a cached list of pre-parsed CSSStyleSheet singletons to be adopted by open Shadow Roots.
 * Operates 100% synchronously in memory with zero network requests and 0ms hydration overhead.
 */
export function getAdoptedStyleSheets(host?: string): CSSStyleSheet[] {
    if (typeof CSSStyleSheet === "undefined") {
        return [];
    }

    if (!sharedTailwindSheet) {
        sharedTailwindSheet = new CSSStyleSheet();
        try {
            sharedTailwindSheet.replaceSync(TAILWIND_CSS);
        } catch (err) {
            console.warn("[AdoptedStyleSheets] Failed to parse inlined Tailwind CSS:", err);
        }
    }

    const sheets: CSSStyleSheet[] = [sharedTailwindSheet];

    if (host && hostThemeRegistry.has(host)) {
        let hostSheet = hostStyleSheets.get(host);
        if (!hostSheet) {
            hostSheet = new CSSStyleSheet();
            try {
                hostSheet.replaceSync(hostThemeRegistry.get(host)!);
                hostStyleSheets.set(host, hostSheet);
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
