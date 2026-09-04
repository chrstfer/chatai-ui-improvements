/**
 * Main Content Script Entry Point
 */

declare const __DEV__: boolean;

import { CodeBlockController } from "./dom/code-block.ts";
import { DomObserver } from "./dom/observer.ts";
import { LayoutManager } from "./layout/layout-manager.ts";
import { SettingsStore } from "./storage/settings-store.ts";
import { HudController } from "./ui/hud.ts";
import { mountVersionOverlay } from "./ui/VersionOverlay.tsx";

async function bootstrap() {
    const store = new SettingsStore();
    const layout = new LayoutManager();
    const codeBlockManager = new CodeBlockController(store);

    const handleRenderAll = () => {
        codeBlockManager.toggleRenderAll();
    };

    const handleFoldAll = () => {
        codeBlockManager.toggleFoldAll();
    };

    const hud = new HudController(store, layout, handleRenderAll, handleFoldAll);
    const observer = new DomObserver(codeBlockManager);

    // 1. Load persisted settings
    const settings = await store.load();

    // 2. Apply initial layout
    layout.apply(settings);

    // 3. Mount floating HUD
    hud.mount();

    // 3b. Mount top-right Version Overlay (Dev builds only)
    const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
    if (isDevelopment) {
        mountVersionOverlay();
    }

    // 4. Start DOM observer
    observer.start();

    // 5. Global Keyboard Shortcuts
    globalThis.addEventListener("keydown", (e) => {
        const keyEvent = e as KeyboardEvent;
        // Alt + W : Toggle Full Width
        if (keyEvent.altKey && (keyEvent.key === "w" || keyEvent.key === "W")) {
            keyEvent.preventDefault();
            const next = !store.settings.fullWidth;
            store.update({ fullWidth: next });
            layout.apply(store.settings);
            hud.update();
        }
        // Alt + O : Toggle Render All Blocks
        if (keyEvent.altKey && (keyEvent.key === "o" || keyEvent.key === "O")) {
            keyEvent.preventDefault();
            handleRenderAll();
        }
        // Alt + F : Toggle Fold/Expand All Rendered Blocks
        if (keyEvent.altKey && (keyEvent.key === "f" || keyEvent.key === "F")) {
            keyEvent.preventDefault();
            handleFoldAll();
        }
    });

    // 6. Debug Build Feature: Expose DevTools Inspection API only in dev mode
    if (isDevelopment) {
        const api = {
            inspect: () => {
                const records = codeBlockManager.getAllRecords();
                console.log("[GeminiOrgMod DEBUG] Total registered blocks:", records.length);
                console.table(
                    records.map((r) => ({
                        id: r.id,
                        rendered: r.isRendered,
                        allFolded: r.allFolded,
                        textLength: r.lastText.length,
                        hasPre: !!r.preEl,
                        hasRenderedView: !!r.renderedEl,
                        renderedRect: r.renderedEl ? r.renderedEl.getBoundingClientRect() : null,
                    })),
                );
                return records;
            },
            getBlocks: () => codeBlockManager.getAllRecords(),
            getBlock: (id: string) => codeBlockManager.getRecord(id),
            getSettings: () => store.settings,
            renderAll: handleRenderAll,
            foldAll: handleFoldAll,
            scan: () => observer.scan(),
        };

        (globalThis as unknown as Record<string, unknown>).__GeminiOrgMod = api;

        // CustomEvent bridge allowing trigger from page context or console without Xray wrapper restrictions
        globalThis.addEventListener("gemini-org-inspect", () => {
            api.inspect();
        });

        // Add 1-click debug trigger to HUD in dev mode
        const hudTitle = document.querySelector<HTMLElement>(".orgmod-hud-title");
        if (hudTitle) {
            hudTitle.title = "Click to inspect registered blocks in console (Dev mode)";
            hudTitle.style.cursor = "pointer";
            hudTitle.addEventListener("click", () => api.inspect());
        }
    }
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => bootstrap());
    } else {
        bootstrap();
    }
}
