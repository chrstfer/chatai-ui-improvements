import type { SiteAdapter } from "../../core/contracts/index.ts";
import { GEMINI_SELECTORS } from "./selectors.ts";
import { GeminiDOMObserver } from "./domObserver.ts";
import { GeminiInjector } from "./injector.tsx";
import { GeminiThemeAuthority } from "./theme.ts";
import { createLogger } from "../../core/logging/index.ts";

export class GeminiSiteAdapter implements SiteAdapter {
    public readonly id = "gemini";
    public readonly name = "Google Gemini";
    public readonly themeAuthority = new GeminiThemeAuthority();

    private logger = createLogger("Gemini");
    private domObserver: GeminiDOMObserver | null = null;
    private injector = new GeminiInjector();

    public matches(url: URL): boolean {
        return url.hostname === "gemini.google.com";
    }

    public initialize(): void {
        this.logger.info("Initializing Gemini adapter");

        this.themeAuthority.onThemeChange((theme) => {
            this.logger.info(`Host theme changed to "${theme}"`);
            this.injector.updateThemes(theme === "dark" ? "dark" : "light");
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

        const scrollerEl = document.querySelector(GEMINI_SELECTORS.SCROLLER);
        if (scrollerEl) {
            this.logger.debug("Observing scroller container: " + GEMINI_SELECTORS.SCROLLER);
        } else {
            this.logger.warn("Scroller container not found, falling back to document.body");
        }

        const scroller = scrollerEl || document.body;
        this.domObserver.observe(scroller);
    }

    public destroy(): void {
        this.logger.info("Destroying Gemini adapter and disconnecting observers");
        this.domObserver?.disconnect();
        this.domObserver = null;
        this.injector.destroyAll();
        this.themeAuthority.destroy();
    }
}
