/**
 * Host-Specific Layout Controller for Google Gemini
 * Injects and manages Gemini chat widening styles and CSS variables.
 */

import { GEMINI_LAYOUT_CSS } from "./styles/layout.generated.ts";
import type { ExtensionSettings } from "../../../contracts/core/index.ts";
import type {
    ClassListLike,
    DocumentLike,
    HostLayoutController,
    StyleDeclarationLike,
} from "../../../contracts/chats/index.ts";
import { createLogger } from "../../../core/logging/index.ts";

export type { ClassListLike, DocumentLike, HostLayoutController, StyleDeclarationLike };

declare const document: DocumentLike | undefined;
declare const CSSStyleSheet: { new (): { replaceSync(css: string): void } } | undefined;

export class GeminiLayoutController implements HostLayoutController {
    private logger = createLogger("Gemini > Layout");
    private sheet: unknown = null;
    private styleElement: { remove(): void } | null = null;

    /**
     * Adopts or injects the compiled Gemini layout stylesheet into the target document.
     */
    public initialize(targetDoc?: DocumentLike): void {
        const doc = targetDoc ?? (typeof document !== "undefined" ? (document as unknown as DocumentLike) : undefined);
        if (!doc) return;
        this.logger.info("Initializing GeminiLayoutController (injecting host widening stylesheet)");

        // Try standard adoptedStyleSheets on the host document
        if (typeof CSSStyleSheet !== "undefined" && doc.adoptedStyleSheets) {
            try {
                if (!this.sheet) {
                    const s = new CSSStyleSheet();
                    s.replaceSync(GEMINI_LAYOUT_CSS);
                    this.sheet = s;
                }
                if (!doc.adoptedStyleSheets.includes(this.sheet)) {
                    doc.adoptedStyleSheets.push(this.sheet);
                    this.logger.debug("Gemini layout CSS adopted via document.adoptedStyleSheets");
                }
                return;
            } catch {
                // Fall back to style element if adoptedStyleSheets is restricted on host document
            }
        }

        // Fallback: inject scoped style element
        if (doc.head && doc.createElement && !doc.getElementById?.("ext-gemini-layout")) {
            const style = doc.createElement("style") as {
                id: string;
                textContent: string;
                remove(): void;
            };
            style.id = "ext-gemini-layout";
            style.textContent = GEMINI_LAYOUT_CSS;
            doc.head.appendChild(style);
            this.styleElement = style;
            this.logger.debug("Gemini layout CSS injected via <style id='ext-gemini-layout'>");
        }
    }

    /**
     * Applies chat width percentage and toggles full-width active class on the body.
     */
    public apply(settings: ExtensionSettings, targetDoc?: DocumentLike): void {
        const doc = targetDoc ?? (typeof document !== "undefined" ? (document as unknown as DocumentLike) : undefined);
        if (!doc) return;

        this.logger.info(
            `Applying layout settings: fullWidth=${settings.fullWidth}, widthPercent=${settings.widthPercent}%`,
        );
        doc.documentElement?.style?.setProperty("--ext-chat-max-width", `${settings.widthPercent}%`);
        doc.documentElement?.classList?.toggle("ext-fullwidth-active", settings.fullWidth);
        doc.body?.classList?.toggle("ext-fullwidth-active", settings.fullWidth);
    }

    /**
     * Cleans up all injected stylesheets, CSS variables, and body classes.
     */
    public destroy(targetDoc?: DocumentLike): void {
        const doc = targetDoc ?? (typeof document !== "undefined" ? (document as unknown as DocumentLike) : undefined);
        if (!doc) return;

        this.logger.info("Destroying GeminiLayoutController: cleaning up CSS variables, body classes, and stylesheets");
        doc.documentElement?.style?.removeProperty("--ext-chat-max-width");
        doc.documentElement?.classList?.remove("ext-fullwidth-active");
        doc.body?.classList?.remove("ext-fullwidth-active");

        if (this.sheet && doc.adoptedStyleSheets) {
            const idx = doc.adoptedStyleSheets.indexOf(this.sheet);
            if (idx !== -1) {
                doc.adoptedStyleSheets.splice(idx, 1);
            }
            this.sheet = null;
            this.logger.debug("Removed sheet from doc.adoptedStyleSheets");
        }

        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
            this.logger.debug("Removed styleElement");
        } else {
            const el = doc.getElementById?.("ext-gemini-layout") as { remove(): void } | null;
            el?.remove?.();
        }
        this.logger.info("GeminiLayoutController destroyed cleanly");
    }
}
