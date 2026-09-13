/**
 * Host Theme Authority contracts.
 */

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
