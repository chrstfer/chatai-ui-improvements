/**
 * Mount Controller for Floating HUD
 * Enforces single Preact root per mount boundary inside an open Shadow Root.
 */

import { render } from "preact";
import { FloatingHud } from "./FloatingHud.tsx";
import type { SettingsStore } from "../../core/storage/settings.ts";
import { getAdoptedStyleSheets } from "../../styles/adoptedStyleSheets.ts";

export interface HudMountHandle {
    unmount: () => void;
    updateTheme: (theme: "light" | "dark") => void;
}

export interface HudMountOptions {
    store: SettingsStore;
    theme?: "light" | "dark";
    host?: string;
    onWidthChange?: (fullWidth: boolean, widthPercent: number) => void;
}

const HUD_CONTAINER_ID = "ext-ai-chat-hud-root";

export function mountHud(options: HudMountOptions): HudMountHandle | null {
    if (typeof document === "undefined") return null;

    // Check if HUD already mounted
    let container = document.getElementById(HUD_CONTAINER_ID);
    if (container) {
        return null;
    }

    container = document.createElement("div");
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

    return {
        unmount: () => {
            unsubscribe();
            render(null, shadowRoot);
            container?.remove();
            container = null;
        },
        updateTheme: (theme: "light" | "dark") => {
            currentTheme = theme;
            if (container) {
                container.dataset.theme = theme;
            }
            renderHud();
        },
    };
}
