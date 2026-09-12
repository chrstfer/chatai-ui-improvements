/**
 * Mount Controller for Floating HUD
 * Enforces single Preact root per mount boundary inside an open Shadow Root.
 */

import { render } from "preact";
import { FloatingHud } from "./FloatingHud.tsx";
import type { SettingsStore } from "../../core/storage/settings.ts";
import { getAdoptedStyleSheets } from "../../styles/adoptedStyleSheets.ts";
import type { ChatColumnBounds } from "../../core/contracts/index.ts";
import { createLogger } from "../../core/logging/index.ts";

export interface HudMountHandle {
    unmount: () => void;
    updateTheme: (theme: "light" | "dark") => void;
}

export interface HudMountOptions {
    store: SettingsStore;
    theme?: "light" | "dark";
    host?: string;
    getChatColumnBounds?: () => ChatColumnBounds | null;
    onWidthChange?: (fullWidth: boolean, widthPercent: number) => void;
}

const HUD_CONTAINER_ID = "ext-ai-chat-hud-root";
const logger = createLogger("HUD > Mount");

export function mountHud(options: HudMountOptions): HudMountHandle | null {
    if (typeof document === "undefined") return null;

    // Check if HUD already mounted - if stale container exists, remove it cleanly
    const existing = document.getElementById(HUD_CONTAINER_ID);
    if (existing) {
        logger.warn("Found pre-existing HUD container element in DOM, cleaning up before re-mount");
        existing.remove();
    }

    logger.info("Mounting Floating HUD into document.body");
    const container = document.createElement("div");
    container.id = HUD_CONTAINER_ID;
    container.dataset.theme = options.theme ?? "light";
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: "open" });
    shadowRoot.adoptedStyleSheets = getAdoptedStyleSheets(options.host ?? "gemini");

    let currentTheme = options.theme ?? "light";

    function renderHud() {
        render(
            <FloatingHud
                settings={options.store.settings}
                theme={currentTheme}
                getChatColumnBounds={options.getChatColumnBounds}
                onUpdateSettings={(partial) => {
                    options.store.update(partial);
                    if (
                        options.onWidthChange &&
                        (partial.fullWidth !== undefined || partial.widthPercent !== undefined)
                    ) {
                        const s = options.store.settings;
                        options.onWidthChange(s.fullWidth, s.widthPercent);
                    }
                }}
            />,
            shadowRoot,
        );
    }

    // Subscribe to store updates
    const unsubscribe = options.store.subscribe(() => {
        renderHud();
    });

    renderHud();
    logger.info("Floating HUD rendered and attached to DOM");

    return {
        unmount: () => {
            logger.info("Unmounting Floating HUD and tearing down shadow root");
            unsubscribe();
            render(null, shadowRoot);
            container.remove();
            const lingering = document.getElementById(HUD_CONTAINER_ID);
            if (lingering) {
                lingering.remove();
            }
            logger.info("Floating HUD unmounted and removed from DOM");
        },
        updateTheme: (theme: "light" | "dark") => {
            logger.debug(`Updating Floating HUD mount theme to "${theme}"`);
            currentTheme = theme;
            container.dataset.theme = theme;
            renderHud();
        },
    };
}
