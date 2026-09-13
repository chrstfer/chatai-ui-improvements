/**
 * Settings and configuration contracts.
 */

export interface ExtensionSettings {
    fullWidth: boolean;
    widthPercent: number;
    hudCollapsed: boolean;
    autoRenderOrg: boolean;
    hudPosition?: { x: number; y: number; anchor?: "left" | "right"; rightOffset?: number };
}

export interface UserSettings {
    themeLock: "system" | "dark" | "light";
    chatMaxWidthPreset: "80%" | "90%" | "94%" | "100%";
    defaultExportFormat: "org" | "markdown" | "json";
    defaultFilenamePattern: string;
    historyAutoPruneThresholdMB: number;
    initialCodeBlockFoldState: "folded" | "children" | "subtree";
}
