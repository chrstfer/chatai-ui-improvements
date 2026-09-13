/**
 * Layout Controller and DOM Abstraction contracts.
 */

import type { ExtensionSettings } from "../core/settings.ts";

export interface StyleDeclarationLike {
    setProperty(prop: string, val: string): void;
    removeProperty(prop: string): void;
    getPropertyValue?(prop: string): string;
}

export interface ClassListLike {
    add(cls: string): void;
    remove(cls: string): void;
    toggle(cls: string, force?: boolean): boolean;
    contains(cls: string): boolean;
}

export interface DocumentLike {
    documentElement?: {
        style?: StyleDeclarationLike;
        classList?: ClassListLike;
    } | null;
    body?: {
        classList?: ClassListLike;
    } | null;
    head?: {
        appendChild(child: unknown): unknown;
    } | null;
    getElementById?(id: string): unknown;
    createElement?(tag: string): unknown;
    adoptedStyleSheets?: unknown[];
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

export interface HostLayoutController {
    /**
     * Initializes layout controllers and adopts/injects stylesheets if needed.
     */
    initialize(targetDoc?: DocumentLike): void;

    /**
     * Applies responsive chat width percentage and layout classes.
     */
    apply(settings: ExtensionSettings, targetDoc?: DocumentLike): void;

    /**
     * Cleans up all injected styles, CSS variables, and layout classes.
     */
    destroy(targetDoc?: DocumentLike): void;
}
