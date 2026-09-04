/**
 * Typed Storage Adapter for Extension Settings
 */

import { DEFAULT_SETTINGS, ExtensionSettings } from "../types/settings.ts";

// WebExtension storage type contract
interface BrowserStorageArea {
    get(keys: string[]): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
}

interface WebExtensionNamespace {
    storage?: {
        local?: BrowserStorageArea;
    };
}

declare const browser: WebExtensionNamespace;

export class SettingsStore {
    private currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };

    get settings(): ExtensionSettings {
        return this.currentSettings;
    }

    async load(): Promise<ExtensionSettings> {
        try {
            if (typeof browser !== "undefined" && browser.storage?.local) {
                const stored = await browser.storage.local.get([
                    "fullWidth",
                    "autoRenderOrg",
                    "widthPercent",
                    "hudCollapsed",
                    "responseFontSize",
                ]);
                if (typeof stored.fullWidth === "boolean") this.currentSettings.fullWidth = stored.fullWidth;
                if (typeof stored.autoRenderOrg === "boolean") {
                    this.currentSettings.autoRenderOrg = stored.autoRenderOrg;
                }
                if (typeof stored.widthPercent === "number") this.currentSettings.widthPercent = stored.widthPercent;
                if (typeof stored.hudCollapsed === "boolean") this.currentSettings.hudCollapsed = stored.hudCollapsed;
                if (typeof stored.responseFontSize === "number") {
                    this.currentSettings.responseFontSize = stored.responseFontSize;
                }
            } else if (typeof localStorage !== "undefined") {
                const local = localStorage.getItem("gemini_orgmod_state");
                if (local) Object.assign(this.currentSettings, JSON.parse(local));
            }
        } catch (e) {
            console.warn("[GeminiOrgMod] Storage load error:", e);
        }
        return this.currentSettings;
    }

    async update(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
        Object.assign(this.currentSettings, partial);
        try {
            if (typeof browser !== "undefined" && browser.storage?.local) {
                const payload: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(this.currentSettings)) {
                    payload[key] = value;
                }
                await browser.storage.local.set(payload);
            } else if (typeof localStorage !== "undefined") {
                localStorage.setItem("gemini_orgmod_state", JSON.stringify(this.currentSettings));
            }
        } catch (e) {
            console.warn("[GeminiOrgMod] Storage save error:", e);
        }
        return this.currentSettings;
    }
}
