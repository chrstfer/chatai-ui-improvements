import type { HostLayoutController } from "./layout.ts";

export type ThemeMode = "light" | "dark" | "auto";
export type ThemeChangeCallback = (theme: "light" | "dark") => void;

/**
 * Host Theme Authority interface supplied by site adapters.
 */
export interface HostThemeAuthority {
    /** True if the host application supports dark/light mode theming */
    readonly supportsTheming: boolean;
    /** Detects the current active theme mode of the host application */
    getTheme(): ThemeMode;
    /** Subscribes to host theme change events (returns an unsubscribe function) */
    onThemeChange(callback: ThemeChangeCallback): () => void;
}

/**
 * Bounds representing the active host chat column.
 */
export interface ChatColumnBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/**
 * Lifecycle contract implemented by host-specific site adapters.
 */
export interface SiteAdapter {
    /** Unique site adapter identifier (e.g. 'gemini', 'claude', 'chatgpt') */
    readonly id: string;
    /** Human-readable name of the host platform */
    readonly name: string;
    /** Theme authority responsible for detecting and observing host dark/light mode */
    readonly themeAuthority: HostThemeAuthority;
    /** Optional host layout controller for responsive width management */
    readonly layoutController?: HostLayoutController;

    /** Evaluates whether this adapter handles the target browser URL */
    matches(url: URL): boolean;

    /** Initializes mutation observers, DOM listeners, and mount controllers */
    initialize(): void;

    /** Idempotently tears down observers, removes injected containers, and restores host visibility */
    destroy(): void;

    /** Retrieves the active host chat column bounding box for HUD clamping */
    getChatColumnBounds?(): ChatColumnBounds | null;
}
