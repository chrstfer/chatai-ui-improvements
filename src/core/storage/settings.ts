/**
 * Typed Storage Adapter & Settings Store for Extension Configuration
 */

export interface ExtensionSettings {
    fullWidth: boolean;
    widthPercent: number;
    hudCollapsed: boolean;
    autoRenderOrg: boolean;
    hudPosition?: { x: number; y: number };
}

export const DEFAULT_SETTINGS: Readonly<ExtensionSettings> = {
    fullWidth: true,
    widthPercent: 94,
    hudCollapsed: false,
    autoRenderOrg: true,
};

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

declare const browser: WebExtensionNamespace | undefined;

export class SettingsStore {
    private currentSettings: ExtensionSettings = { ...DEFAULT_SETTINGS };
    private listeners = new Set<(settings: ExtensionSettings) => void>();

    constructor(initialSettings?: Partial<ExtensionSettings>) {
        if (initialSettings) {
            this.currentSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
        }
    }

    public get settings(): ExtensionSettings {
        return { ...this.currentSettings };
    }

    public subscribe(listener: (settings: ExtensionSettings) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private notify(): void {
        const copy = this.settings;
        for (const listener of this.listeners) {
            try {
                listener(copy);
            } catch (err) {
                console.error("[SettingsStore] Subscriber error:", err);
            }
        }
    }

    public async load(): Promise<ExtensionSettings> {
        try {
            const storage = this.getStorageArea();
            if (storage) {
                const stored = await storage.get([
                    "fullWidth",
                    "widthPercent",
                    "hudCollapsed",
                    "autoRenderOrg",
                    "hudPosition",
                ]);
                if (typeof stored.fullWidth === "boolean") {
                    this.currentSettings.fullWidth = stored.fullWidth;
                }
                if (typeof stored.widthPercent === "number") {
                    this.currentSettings.widthPercent = stored.widthPercent;
                }
                if (typeof stored.hudCollapsed === "boolean") {
                    this.currentSettings.hudCollapsed = stored.hudCollapsed;
                }
                if (typeof stored.autoRenderOrg === "boolean") {
                    this.currentSettings.autoRenderOrg = stored.autoRenderOrg;
                }
                if (
                    stored.hudPosition &&
                    typeof stored.hudPosition === "object" &&
                    "x" in (stored.hudPosition as Record<string, unknown>) &&
                    "y" in (stored.hudPosition as Record<string, unknown>)
                ) {
                    this.currentSettings.hudPosition = stored.hudPosition as { x: number; y: number };
                }
            } else if (typeof localStorage !== "undefined") {
                const local = localStorage.getItem("ext_chat_ui_settings");
                if (local) {
                    const parsed = JSON.parse(local);
                    Object.assign(this.currentSettings, parsed);
                }
            }
        } catch (e) {
            console.warn("[SettingsStore] Storage load error:", e);
        }
        this.notify();
        return this.settings;
    }

    public async update(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
        Object.assign(this.currentSettings, partial);
        try {
            const storage = this.getStorageArea();
            if (storage) {
                const payload: Record<string, unknown> = {};
                for (const [key, value] of Object.entries(this.currentSettings)) {
                    payload[key] = value;
                }
                await storage.set(payload);
            } else if (typeof localStorage !== "undefined") {
                localStorage.setItem("ext_chat_ui_settings", JSON.stringify(this.currentSettings));
            }
        } catch (e) {
            console.warn("[SettingsStore] Storage save error:", e);
        }
        this.notify();
        return this.settings;
    }

    public reset(): void {
        this.currentSettings = { ...DEFAULT_SETTINGS };
        this.notify();
    }

    private getStorageArea(): BrowserStorageArea | null {
        if (typeof browser !== "undefined" && browser?.storage?.local) {
            return browser.storage.local;
        }
        return null;
    }
}

export const defaultSettingsStore = new SettingsStore();
