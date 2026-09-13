/**
 * Site Adapter contract implemented by host-specific chat providers.
 */

import type { ChatColumnBounds, HostLayoutController } from "./layout.ts";
import type { HostThemeAuthority } from "./theme.ts";

/**
 * Lifecycle contract implemented by host-specific site adapters.
 */
export interface SiteAdapter {
    /** Unique site adapter identifier (e.g. 'gemini', 'duckai', 'chatgpt') */
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

/** Factory returning a lazily resolved site adapter */
export type ChatAdapterFactory = () => Promise<SiteAdapter>;

/** Descriptor for lazy-loading site adapters upon matching URL */
export interface ChatAdapterDefinition {
    readonly id: string;
    readonly name: string;
    matches(url: URL): boolean;
    load: ChatAdapterFactory;
}
