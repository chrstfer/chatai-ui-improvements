import type { SiteAdapter } from "../../core/contracts/index.ts";
import { GEMINI_SELECTORS } from "./selectors.ts";
import { GeminiDOMObserver } from "./domObserver.ts";
import { GeminiInjector } from "./injector.tsx";
import { GeminiThemeAuthority } from "./theme.ts";

export class GeminiSiteAdapter implements SiteAdapter {
    public readonly id = "gemini";
    public readonly name = "Google Gemini";
    public readonly themeAuthority = new GeminiThemeAuthority();

    private domObserver: GeminiDOMObserver | null = null;
    private injector = new GeminiInjector();

    public matches(url: URL): boolean {
        return url.hostname === "gemini.google.com";
    }

    public initialize(): void {
        this.themeAuthority.onThemeChange((theme) => {
            this.injector.updateThemes(theme === "dark" ? "dark" : "light");
        });

        this.domObserver = new GeminiDOMObserver({
            onBlockDiscovered: (_block) => {
                // Discovered code-block, awaiting settlement or streaming update
            },
            onBlockStreaming: (_block) => {
                // Stream in flight (>=200ms debounce)
            },
            onBlockSettled: (block) => {
                const theme = this.themeAuthority.getTheme() === "dark" ? "dark" : "light";
                this.injector.inject(block, theme);
            },
        });

        const scroller = document.querySelector(GEMINI_SELECTORS.SCROLLER) || document.body;
        this.domObserver.observe(scroller);
    }

    public destroy(): void {
        this.domObserver?.disconnect();
        this.domObserver = null;
        this.injector.destroyAll();
        this.themeAuthority.destroy();
    }
}
