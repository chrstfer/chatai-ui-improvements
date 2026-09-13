/**
 * Renderer and Renderer Registry contracts.
 */

import type { DocumentViewComponent } from "./documentView.ts";

/**
 * Contract implemented by document view presentation modules.
 */
export interface Renderer {
    readonly id: string;
    readonly name: string;
    readonly view: DocumentViewComponent;
}

/**
 * Lazy definition for dynamic renderer chunk loading.
 */
export interface LazyRendererDefinition {
    readonly formatId: string;
    load(): Promise<Renderer>;
}
