/**
 * 3-Layer Layout and Widescreen Manager
 * Provides deterministic pure domain computation (Layer 1) and DOM application adapter (Layer 2).
 */

import { ExtensionSettings } from "../types/settings.ts";

export interface LayoutDeclarations {
    cssVars: Record<string, string>;
    classNames: string[];
}

/**
 * Layer 1 (Pure Domain Core): Deterministic mapping from settings to CSS declarations.
 * Fully testable in headless Deno environments without DOM mocks.
 */
export function computeLayoutStyles(settings: ExtensionSettings): LayoutDeclarations {
    const fontSize = settings.responseFontSize || 100;
    const widthPercent = settings.widthPercent || 86;

    const cssVars: Record<string, string> = {
        "--orgmod-max-width": `${widthPercent}%`,
        "--orgmod-response-font-size": `${fontSize}%`,
        "--orgmod-response-font-size-multiplier": `${fontSize / 100}`,
    };

    const classNames: string[] = [];
    if (settings.fullWidth) {
        classNames.push("orgmod-fullwidth-active");
    }

    return { cssVars, classNames };
}

/**
 * Layer 2 (I/O & DOM Adapter): Minimal bridge applying layout declarations to target DOM elements.
 */
export function applyLayoutDeclarations(
    declarations: LayoutDeclarations,
    rootElement?: HTMLElement,
    bodyElement?: HTMLElement,
): void {
    const root = rootElement || (typeof document !== "undefined" ? document.documentElement : null);
    const body = bodyElement || (typeof document !== "undefined" ? document.body : null);

    if (root?.style) {
        for (const [prop, val] of Object.entries(declarations.cssVars)) {
            root.style.setProperty(prop, val);
        }
    }

    if (body?.classList) {
        if (declarations.classNames.includes("orgmod-fullwidth-active")) {
            body.classList.add("orgmod-fullwidth-active");
        } else {
            body.classList.remove("orgmod-fullwidth-active");
        }
    }
}

/**
 * Legacy/Facade LayoutManager retaining backward compatibility.
 */
export class LayoutManager {
    apply(settings: ExtensionSettings): void {
        const decls = computeLayoutStyles(settings);
        applyLayoutDeclarations(decls);
    }
}
