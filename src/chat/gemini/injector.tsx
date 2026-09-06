import { render } from "preact";
import { EXTENSION_INJECTED } from "./selectors.ts";
import type { GeminiCodeBlockRef } from "./types.ts";
import { DiagnosticPlaceholderBlock } from "../../views/common/DiagnosticPlaceholderBlock.tsx";

declare const chrome: {
    runtime?: {
        getURL?: (path: string) => string;
    };
} | undefined;

export class GeminiInjector {
    private activeRoots = new Map<
        string,
        { container: HTMLElement; shadowRoot: ShadowRoot; destroy: () => void }
    >();

    /**
     * Injects sibling container beside <code-block>, hides native block non-destructively,
     * attaches open Shadow Root, links the external stylesheet, and mounts DiagnosticPlaceholderBlock.
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

        // Mount general diagnostic placeholder component
        render(
            <DiagnosticPlaceholderBlock
                adapterName="Gemini"
                language={languageHint}
                rawText={rawText}
            />,
            shadowRoot,
        );

        block.siblingContainer = container;

        this.activeRoots.set(block.id, {
            container,
            shadowRoot,
            destroy: () => {
                render(null, shadowRoot);
                container.remove();
                hostElement.style.display = "";
                delete hostElement.dataset[EXTENSION_INJECTED.PROCESSED_ATTR];
            },
        });
    }

    public updateThemes(theme: "light" | "dark"): void {
        for (const { container } of this.activeRoots.values()) {
            container.dataset.theme = theme;
        }
    }

    public destroyAll(): void {
        for (const { destroy } of this.activeRoots.values()) {
            destroy();
        }
        this.activeRoots.clear();
    }
}
