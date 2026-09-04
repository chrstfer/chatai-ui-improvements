/**
 * Top-Level Extension Root Component
 * Mounts shared Preact Contexts (SettingsProvider, BlockStoreProvider), HUD, and Dev Version Overlay.
 */

declare const __DEV__: boolean;

import { FunctionComponent, render } from "preact";
import { BlockStore, BlockStoreProvider, globalBlockStore } from "../context/BlockStoreContext.tsx";
import { SettingsProvider } from "../context/SettingsContext.tsx";
import { SettingsStore } from "../storage/settings-store.ts";
import { Hud } from "./hud.tsx";
import { VersionOverlay } from "./VersionOverlay.tsx";

export interface ExtensionRootProps {
    store: SettingsStore;
    blockStore?: BlockStore;
    onExportChat?: () => void;
}

export const ExtensionRoot: FunctionComponent<ExtensionRootProps> = ({
    store,
    blockStore = globalBlockStore,
    onExportChat,
}) => {
    const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__;

    return (
        <SettingsProvider store={store}>
            <BlockStoreProvider store={blockStore}>
                <Hud onExportChat={onExportChat} />
                {isDevelopment && <VersionOverlay />}
            </BlockStoreProvider>
        </SettingsProvider>
    );
};

export function mountExtensionRoot(
    store: SettingsStore,
    blockStore: BlockStore = globalBlockStore,
    onExportChat?: () => void,
): HTMLElement {
    if (typeof document === "undefined") {
        return {} as HTMLElement;
    }

    let rootEl = document.getElementById("orgmod-extension-root");
    if (!rootEl) {
        rootEl = document.createElement("div");
        rootEl.id = "orgmod-extension-root";
        rootEl.setAttribute("data-gemini-org", "extension-root");
        document.body.appendChild(rootEl);
    }

    render(
        <ExtensionRoot
            store={store}
            blockStore={blockStore}
            onExportChat={onExportChat}
        />,
        rootEl,
    );

    return rootEl;
}
