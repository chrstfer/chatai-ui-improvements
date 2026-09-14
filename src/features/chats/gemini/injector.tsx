import { render } from "preact";
import { EXTENSION_INJECTED } from "./selectors.ts";
import type { GeminiCodeBlockRef } from "./types.ts";
import { InSituCodeBlockContainer } from "@internal/views/codeblock";
import { createLogger } from "@internal/core/logging";
import { defaultMatcherRegistry } from "@internal/registries";
import { defaultRendererRegistry } from "@internal/registries";
import { defaultAstCache } from "@internal/store";
import { computeContentHash } from "@internal/core/utils";
import { getAdoptedStyleSheets } from "@internal/styles";
import "./styles/tokens.ts";

export class GeminiInjector {
    private logger = createLogger("Gemini > Injector");
    private activeRoots = new Map<
        string,
        { container: HTMLElement; shadowRoot: ShadowRoot; destroy: () => void }
    >();
    private destroyed = false;

    /**
     * Injects sibling container beside <code-block>, hides native block non-destructively,
     * attaches open Shadow Root, adopts inlined stylesheets synchronously, and mounts InSituCodeBlockContainer.
     */
    public inject(
        block: GeminiCodeBlockRef,
        currentTheme: "light" | "dark" = "light",
    ): void {
        if (this.destroyed) return;
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

        // Single-pass format matching (0ms)
        const firstLines = rawText.split("\n").slice(0, 10);
        const matched = defaultMatcherRegistry.findMatching(languageHint, firstLines);
        const formatId = matched?.id ?? languageHint.trim().toLowerCase();

        // Non-Destructive Host Bypass: verify registered rendered view capability before touching host DOM
        const hasRenderedView = defaultRendererRegistry.has(formatId);
        if (!hasRenderedView) {
            this.logger.debug(
                `Bypassing injection for block #${block.id}: no alternate rendered view available for "${formatId}"`,
            );
            return;
        }

        // Create sibling container
        const container = document.createElement("div");
        container.className = EXTENSION_INJECTED.CONTAINER_CLASS;
        container.dataset.hostId = block.id;
        container.dataset.theme = currentTheme;
        container.classList.toggle("dark", currentTheme === "dark");
        container.dataset.extMounted = "true";

        // Insert as sibling immediately before native <code-block>
        hostElement.parentElement?.insertBefore(container, hostElement);

        // Non-destructive hide of native block (preserves data-island)
        hostElement.style.display = "none";

        // Attach open Shadow Root
        const shadowRoot = container.attachShadow({ mode: "open" });

        // Synchronously adopt pre-compiled inlined stylesheets (zero network requests, 0ms hydration)
        shadowRoot.adoptedStyleSheets = getAdoptedStyleSheets("gemini");

        // Retrieve pre-cached AST if already settled in background
        const hash = computeContentHash(rawText, formatId);
        const ast = defaultAstCache.get(hash, formatId);

        // Mount production InSituCodeBlockContainer component with canonical formatId
        render(
            <InSituCodeBlockContainer
                rawText={rawText}
                language={formatId}
                hasRenderedView={hasRenderedView}
                hostElement={hostElement}
                ast={ast}
                theme={currentTheme}
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
        for (const { container, shadowRoot } of this.activeRoots.values()) {
            container.dataset.theme = theme;
            container.classList.toggle("dark", theme === "dark");
            const innerContainer = shadowRoot.querySelector<HTMLElement>(".ext-codeblock-container");
            if (innerContainer) {
                innerContainer.dataset.theme = theme;
                innerContainer.classList.toggle("dark", theme === "dark");
            }
        }
    }

    public destroyAll(): void {
        this.destroyed = true;
        this.logger.info(`Cleaning up ${this.activeRoots.size} active Preact root(s)`);
        for (const { destroy } of this.activeRoots.values()) {
            destroy();
        }
        this.activeRoots.clear();

        // Extra safety sweep for any lingering injected elements or hidden native code-blocks
        if (typeof document !== "undefined") {
            const lingering = document.querySelectorAll(
                `.${EXTENSION_INJECTED.CONTAINER_CLASS}, [data-ext-mounted="true"]`,
            );
            if (lingering.length > 0) {
                this.logger.debug(`Sweeping ${lingering.length} lingering injected container(s)`);
                lingering.forEach((el) => el.remove());
            }

            const hiddenBlocks = document.querySelectorAll<HTMLElement>("code-block");
            hiddenBlocks.forEach((block) => {
                if (block.style.display === "none") {
                    block.style.display = "";
                }
                block.removeAttribute(EXTENSION_INJECTED.PROCESSED_ATTR);
            });
        }
        this.logger.info("Injector destroyAll complete: DOM fully restored");
    }

    public reset(): void {
        this.destroyed = false;
    }
}
