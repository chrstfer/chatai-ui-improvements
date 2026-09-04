/**
 * Preact Settings Context & Layer 3 Reactive Style Synchronization Hook
 */

import { ComponentChildren, createContext, FunctionComponent } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { applyLayoutDeclarations, computeLayoutStyles } from "../layout/layout-manager.ts";
import { SettingsStore } from "../storage/settings-store.ts";
import { ExtensionSettings } from "../types/settings.ts";

export interface SettingsContextValue {
    settings: ExtensionSettings;
    updateSettings: (partial: Partial<ExtensionSettings>) => Promise<ExtensionSettings>;
    reloadSettings: () => Promise<ExtensionSettings>;
    store: SettingsStore;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Layer 3 (Preact Integration): Reactive hook applying computed layout declarations on settings change.
 */
export function useLayoutSync(settings: ExtensionSettings, targetRoot?: HTMLElement, targetBody?: HTMLElement): void {
    useEffect(() => {
        const declarations = computeLayoutStyles(settings);
        applyLayoutDeclarations(declarations, targetRoot, targetBody);
    }, [settings.fullWidth, settings.widthPercent, settings.responseFontSize, targetRoot, targetBody]);
}

export interface SettingsProviderProps {
    store: SettingsStore;
    children?: ComponentChildren;
}

export const SettingsProvider: FunctionComponent<SettingsProviderProps> = ({ store, children }) => {
    const [settings, setSettings] = useState<ExtensionSettings>({ ...store.settings });

    // Sync layout automatically on settings mutation
    useLayoutSync(settings);

    const updateSettings = async (partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> => {
        const next = await store.update(partial);
        setSettings({ ...next });
        return next;
    };

    const reloadSettings = async (): Promise<ExtensionSettings> => {
        const loaded = await store.load();
        setSettings({ ...loaded });
        return loaded;
    };

    return (
        <SettingsContext.Provider
            value={{
                settings,
                updateSettings,
                reloadSettings,
                store,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

export function useSettings(): SettingsContextValue {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
