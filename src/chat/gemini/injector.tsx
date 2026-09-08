import { render } from "preact";
import { EXTENSION_INJECTED } from "./selectors.ts";
import type { GeminiCodeBlockRef } from "./types.ts";
import { InSituCodeBlockContainer } from "../../views/codeblock/index.ts";
import { createLogger } from "../../core/logging/index.ts";
import { defaultLanguageRegistry } from "../../languages/registry.ts";

declare const chrome: {
    runtime?: {
        getURL?: (path: string) => string;
    };
} | undefined;

export class GeminiInjector {
    private logger = createLogger("Gemini > Injector");
    private activeRoots = new Map<
        string,
        { container: HTMLElement; shadowRoot: ShadowRoot; destroy: () => void }
    >();

    /**
     * Injects sibling container beside <code-block>, hides native block non-destructively,
     * attaches open Shadow Root, links the external stylesheet, and mounts InSituCodeBlockContainer.
     */
    public inject(
        block: GeminiCodeBlockRef,
        currentTheme: "light" | "dark" = "light",
    ): void {
        const { hostElement, rawText, languageHint } = block;

        // Guard against duplicate injection
        if (
            hostElement.parentElement?.querySelector(
                `.${EXTENSION_INJECTED.CONTAINER_CLASS}[data-host-id="${block.id}"]`,
            )
        ) {
            this.logger.debug(`Skipping duplicate injection for block #${block.id}`);
            return;
        }

        // Create sibling container
        const container = document.createElement("div");
        container.className = EXTENSION_INJECTED.CONTAINER_CLASS;
        container.dataset.hostId = block.id;
        container.dataset.theme = currentTheme;
        container.dataset.extMounted = "true";

        // Insert as sibling immediately before native <code-block>
        hostElement.parentElement?.insertBefore(container, hostElement);

        // Non-destructive hide of native block (preserves data-island)
        hostElement.style.display = "none";

        // Attach open Shadow Root
        const shadowRoot = container.attachShadow({ mode: "open" });

        // Link external stylesheet into shadow root
        const link = document.createElement("link");
        link.rel = "stylesheet";
        const runtimeUrl = (typeof chrome !== "undefined" && chrome?.runtime?.getURL)
            ? chrome.runtime.getURL("src/chat/gemini/styles/gemini.css")
            : "/src/chat/gemini/styles/gemini.css";
        link.href = runtimeUrl;
        shadowRoot.appendChild(link);

        // Coordinate AST settlement and rendered view capability via centralized registry
        const { langDef, ast } = defaultLanguageRegistry.settleContent(rawText, languageHint);
        const hasRenderedView = langDef !== undefined;

        // Mount production InSituCodeBlockContainer component
        render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={languageHint}
                hasRenderedView={hasRenderedView}
                hostElement={hostElement}
                ast={ast}
            />,
            shadowRoot,
        );

        block.siblingContainer = container;

        this.logger.info(`Mounted Shadow Root sibling for block #${block.id} (theme: "${currentTheme}")`);

        this.activeRoots.set(block.id, {
            container,
            shadowRoot,
            destroy: () => {
                this.logger.debug(`Unmounting Preact root and restoring host element for block #${block.id}`);
                render(null, shadowRoot);
                container.remove();
                hostElement.style.display = "";
                hostElement.removeAttribute(EXTENSION_INJECTED.PROCESSED_ATTR);
            },
        });
    }

    public updateThemes(theme: "light" | "dark"): void {
        this.logger.debug(`Updating ${this.activeRoots.size} mounted root(s) to theme "${theme}"`);
        for (const { container } of this.activeRoots.values()) {
            container.dataset.theme = theme;
        }
    }

    public destroyAll(): void {
        this.logger.info(`Cleaning up ${this.activeRoots.size} active Preact root(s)`);
        for (const { destroy } of this.activeRoots.values()) {
            destroy();
        }
        this.activeRoots.clear();
    }
}
