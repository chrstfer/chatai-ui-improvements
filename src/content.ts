/**
 * Main Content Script Entry Point
 * Mounts the unified Preact Extension Root and orchestrates DOM observation.
 */

declare const __DEV__: boolean;

import { globalBlockStore } from "./context/BlockStoreContext.tsx";
import { extractChatConversation } from "./dom/chat-extractor.ts";
import { CodeBlockController } from "./dom/code-block.tsx";
import { DomObserver } from "./dom/observer.ts";
import { exportChatToOrg } from "./languages/org/export/chat-exporter.ts";
import { globalToolbarRegistry } from "./languages/org/index.ts";
import { SettingsStore } from "./storage/settings-store.ts";
import { mountExtensionRoot } from "./ui/ExtensionRoot.tsx";

async function bootstrap() {
    const store = new SettingsStore();
    const blockStore = globalBlockStore;
    const codeBlockManager = new CodeBlockController(store, globalToolbarRegistry, blockStore);

    const handleRenderAll = () => {
        blockStore.toggleRenderAll();
    };

    const handleFoldAll = () => {
        blockStore.toggleFoldAll();
    };

    const handleExportChat = () => {
        const conversation = extractChatConversation(codeBlockManager);
        const orgText = exportChatToOrg(conversation);
        const blob = new Blob([orgText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeTitle = (conversation.title || "gemini-chat")
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        const dateStr = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `${safeTitle}-${dateStr}.org`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    const observer = new DomObserver(codeBlockManager);

    // 1. Load initial persisted settings
    await store.load();

    // 2. Mount unified declarative Preact Extension Root (SettingsProvider, BlockStoreProvider, LayoutSync, HUD, Dev VersionOverlay)
    mountExtensionRoot(store, blockStore, handleExportChat);

    // 3. Start DOM observer
    observer.start();

    // 4. Global Keyboard Shortcuts
    globalThis.addEventListener("keydown", (e) => {
        const keyEvent = e as KeyboardEvent;
        // Alt + W : Toggle Full Width
        if (keyEvent.altKey && (keyEvent.key === "w" || keyEvent.key === "W")) {
            keyEvent.preventDefault();
            const next = !store.settings.fullWidth;
            store.update({ fullWidth: next });
        }
        // Alt + O : Toggle Render All Blocks
        if (keyEvent.altKey && (keyEvent.key === "o" || keyEvent.key === "O")) {
            keyEvent.preventDefault();
            handleRenderAll();
        }
        // Alt + F : Toggle Fold/Expand All Blocks
        if (keyEvent.altKey && (keyEvent.key === "f" || keyEvent.key === "F")) {
            keyEvent.preventDefault();
            handleFoldAll();
        }
    });

    // 5. Debug Build Feature: Expose DevTools Inspection API strictly in dev mode
    const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;
    if (isDevelopment) {
        const api = {
            inspect: () => {
                const records = codeBlockManager.getAllRecords();
                const cached = blockStore.getAllCached();
                console.log("[GeminiOrgMod DEBUG] Total registered blocks:", records.length, "Cached ASTs:", cached.length);
                console.table(
                    records.map((r) => ({
                        id: r.id,
                        lang: r.lang,
                        textLength: r.lastText.length,
                        hasMount: !!r.mountEl,
                    })),
                );
                return { records, cached };
            },
            getBlocks: () => codeBlockManager.getAllRecords(),
            getBlock: (id: string) => codeBlockManager.getRecord(id),
            getBlockStore: () => blockStore,
            getSettings: () => store.settings,
            renderAll: handleRenderAll,
            foldAll: handleFoldAll,
            exportChat: handleExportChat,
            scan: () => observer.scan(),
        };

        (globalThis as unknown as Record<string, unknown>).__GeminiOrgMod = api;

        // CustomEvent bridge allowing trigger from page context or console without Xray wrapper restrictions
        globalThis.addEventListener("gemini-org-inspect", () => {
            api.inspect();
        });
    }
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => bootstrap());
    } else {
        bootstrap();
    }
}
