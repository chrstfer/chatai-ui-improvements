import { DUCKAI_LAYOUT_CSS } from "./styles/layout.generated.ts";
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

/**
 * Host Layout Controller for DuckDuckGo AI (duck.ai).
 * Injects and manages Duck.ai chat stream widening styles and CSS variables.
 */
export class DuckAiLayoutController implements HostLayoutController {
    private logger = createLogger("DuckAI > Layout");
    private sheet: unknown = null;
    private styleElement: { remove(): void } | null = null;

    /**
     * Adopts or injects the compiled Duck.ai layout stylesheet into the target document.
     */
    public initialize(targetDoc?: DocumentLike): void {
        const doc = targetDoc ?? (typeof document !== "undefined" ? (document as unknown as DocumentLike) : undefined);
        if (!doc) return;
        this.logger.info("Initializing DuckAiLayoutController (injecting host widening stylesheet)");

        // Try standard adoptedStyleSheets on host document
        if (typeof CSSStyleSheet !== "undefined" && doc.adoptedStyleSheets) {
            try {
                if (!this.sheet) {
                    const s = new CSSStyleSheet();
                    s.replaceSync(DUCKAI_LAYOUT_CSS);
                    this.sheet = s;
                }
                if (!doc.adoptedStyleSheets.includes(this.sheet)) {
                    doc.adoptedStyleSheets.push(this.sheet);
                    this.logger.debug("Duck.ai layout CSS adopted via document.adoptedStyleSheets");
                }
                return;
            } catch {
                // Fall back to style element if adoptedStyleSheets is restricted
            }
        }

        // Fallback: inject scoped style element
        if (doc.head && doc.createElement && !doc.getElementById?.("ext-duckai-layout")) {
            const style = doc.createElement("style") as {
                id: string;
                textContent: string;
                remove(): void;
            };
            style.id = "ext-duckai-layout";
            style.textContent = DUCKAI_LAYOUT_CSS;
            doc.head.appendChild(style);
            this.styleElement = style;
            this.logger.debug("Duck.ai layout CSS injected via <style id='ext-duckai-layout'>");
        }
    }

    /**
     * Applies chat width percentage and toggles full-width active class on the body and documentElement.
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

        this.logger.info("Destroying DuckAiLayoutController: cleaning up CSS variables, body classes, and stylesheets");
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
            const el = doc.getElementById?.("ext-duckai-layout") as { remove(): void } | null;
            el?.remove?.();
        }
        this.logger.info("DuckAiLayoutController destroyed cleanly");
    }
}
