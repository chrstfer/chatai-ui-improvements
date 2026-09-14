import { render } from "preact";
import { DUCKAI_EXTENSION_INJECTED, DUCKAI_SELECTORS } from "./selectors.ts";
import type { DuckAiCodeBlockRef } from "./types.ts";
import { InSituCodeBlockContainer } from "../../../views/codeblock/index.ts";
import { createLogger } from "../../../core/logging/index.ts";
import { defaultMatcherRegistry } from "../../../registries/matcherRegistry.ts";
import { defaultRendererRegistry } from "../../../registries/rendererRegistry.ts";
import { defaultAstCache } from "../../../store/astCache.ts";
import { computeContentHash } from "../../../core/utils/contentHash.ts";
import { getAdoptedStyleSheets } from "../../../styles/adoptedStyleSheets.ts";
import "./styles/tokens.ts";

/**
 * Manages Shadow DOM injection and Preact mounting for DuckDuckGo AI code blocks.
 * Adheres strictly to declarative Preact-first UI and single Preact root per mount boundary.
 */
export class DuckAiInjector {
    private logger = createLogger("DuckAI > Injector");
    private activeRoots = new Map<
        string,
        { container: HTMLElement; shadowRoot: ShadowRoot; destroy: () => void }
    >();
    private destroyed = false;

    /**
     * Injects a sibling container immediately before div[data-streamdown="code-block"],
     * hides the native block non-destructively, attaches open Shadow Root,
     * adopts stylesheets, and mounts InSituCodeBlockContainer.
     */
    public inject(
        block: DuckAiCodeBlockRef,
        currentTheme: "light" | "dark" = "light",
    ): void {
        if (this.destroyed) return;
        const { hostElement, rawCode, rawHint } = block;

        // Guard against duplicate injection
        if (
            hostElement.parentElement?.querySelector(
                `.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}[data-host-id="${block.id}"]`,
            )
        ) {
            this.logger.debug(`Skipping duplicate injection for block #${block.id}`);
            return;
        }

        // Single-pass format matching
        const firstLines = rawCode.split("\n").slice(0, 10);
        const matched = defaultMatcherRegistry.findMatching(rawHint, firstLines);
        const formatId = matched?.id ?? rawHint.trim().toLowerCase();

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
        container.className = DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS;
        container.dataset.hostId = block.id;
        container.dataset.theme = currentTheme;
        container.classList.toggle("dark", currentTheme === "dark");
        container.dataset.extMounted = "true";

        // Insert as sibling immediately before native code-block container
        hostElement.parentElement?.insertBefore(container, hostElement);

        // Non-destructive hide of native block (preserves data-island)
        hostElement.style.display = "none";
        hostElement.setAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR, "true");

        // Attach open Shadow Root
        const shadowRoot = container.attachShadow({ mode: "open" });

        // Synchronously adopt pre-compiled inlined stylesheets
        shadowRoot.adoptedStyleSheets = getAdoptedStyleSheets("duckai");

        // Retrieve pre-cached AST if already settled in background
        const hash = computeContentHash(rawCode, formatId);
        const ast = defaultAstCache.get(hash, formatId);

        // Mount production InSituCodeBlockContainer component
        render(
            <InSituCodeBlockContainer
                rawText={rawCode}
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
                hostElement.removeAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR);
            },
        });
    }

    /**
     * Broadcasts theme updates to all active mounted Shadow Roots.
     */
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

    /**
     * Tears down all active Preact roots, removes sibling containers, and restores native blocks.
     */
    public destroyAll(): void {
        this.destroyed = true;
        this.logger.info(`Cleaning up ${this.activeRoots.size} active Preact root(s)`);
        for (const { destroy } of this.activeRoots.values()) {
            destroy();
        }
        this.activeRoots.clear();

        // Extra safety sweep for lingering injected elements or hidden native blocks
        if (typeof document !== "undefined") {
            const lingering = document.querySelectorAll(
                `.${DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS}, [data-ext-mounted="true"]`,
            );
            if (lingering.length > 0) {
                this.logger.debug(`Sweeping ${lingering.length} lingering injected container(s)`);
                lingering.forEach((el) => el.remove());
            }

            const hiddenBlocks = document.querySelectorAll<HTMLElement>(DUCKAI_SELECTORS.CODE_BLOCK);
            hiddenBlocks.forEach((block) => {
                if (block.style.display === "none") {
                    block.style.display = "";
                }
                block.removeAttribute(DUCKAI_EXTENSION_INJECTED.PROCESSED_ATTR);
            });
        }
        this.logger.info("Injector destroyAll complete: DOM fully restored");
    }

    /**
     * Resets destroyed status for new sessions or thread switches.
     */
    public reset(): void {
        this.destroyed = false;
    }
}
