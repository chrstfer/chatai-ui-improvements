import { GEMINI_SELECTORS } from "./selectors.ts";
import type { GeminiCodeBlockRef } from "./types.ts";
import { createLogger } from "../../../core/logging/index.ts";

export class GeminiScraper {
    private logger = createLogger("Gemini > Scraper");

    /**
     * Extracts raw code text directly from the native data-island element.
     * Preserves exact whitespace and character content without mutation.
     */
    public extractCodeText(codeBlockElement: HTMLElement): string {
        const codeEl = codeBlockElement.querySelector<HTMLElement>(GEMINI_SELECTORS.CODE_CONTENT);
        if (!codeEl) {
            this.logger.warn(`Code content element missing for selector: ${GEMINI_SELECTORS.CODE_CONTENT}`);
        }
        return codeEl?.textContent ?? "";
    }

    /**
     * Detects language hint using explicit tag, falling back to 3-line Org heuristic.
     */
    public detectLanguageHint(codeBlockElement: HTMLElement, rawText: string): string {
        const headerSpan = codeBlockElement.querySelector<HTMLElement>(GEMINI_SELECTORS.LANGUAGE_TAG);
        const tagText = headerSpan?.textContent?.trim().toLowerCase() ?? "";

        if (tagText && tagText !== "code snippet" && tagText !== "plain text") {
            return tagText;
        }

        const firstThreeLines = rawText.split("\n", 3);
        const isOrgHeuristic = firstThreeLines.some((line) =>
            /^\*+\s/.test(line) ||
            /^#\+TITLE:/i.test(line) ||
            /^#\+BEGIN_SRC/i.test(line) ||
            /^#\+AUTHOR:/i.test(line)
        );

        if (isOrgHeuristic) {
            this.logger.debug(`Detected language "org" via regex heuristic (host tag was "${tagText || "empty"}")`);
            return "org";
        }

        return tagText || "plaintext";
    }

    /**
     * Checks whether the turn containing this element is fully completed.
     */
    public isTurnCompleted(element: HTMLElement): boolean {
        const turnContainer = element.closest(GEMINI_SELECTORS.TURN_CONTAINER);
        if (!turnContainer) return false;
        return !!turnContainer.querySelector(GEMINI_SELECTORS.RESPONSE_FOOTER_ACTIONS);
    }

    /**
     * Builds a structured reference from a native <code-block> element.
     */
    public parseCodeBlock(codeBlockElement: HTMLElement): GeminiCodeBlockRef | null {
        const codeContent = codeBlockElement.querySelector<HTMLElement>(GEMINI_SELECTORS.CODE_CONTENT);
        if (!codeContent) {
            this.logger.warn(
                `Found <code-block> but missing child ${GEMINI_SELECTORS.CODE_CONTENT} (potential selector drift)`,
            );
            return null;
        }

        const rawText = codeContent.textContent ?? "";
        const languageHint = this.detectLanguageHint(codeBlockElement, rawText);
        const isSettled = this.isTurnCompleted(codeBlockElement);

        const id = codeBlockElement.dataset.extBlockId ||
            `gemini-block-${Math.random().toString(36).slice(2, 9)}`;
        codeBlockElement.dataset.extBlockId = id;

        return {
            id,
            hostElement: codeBlockElement,
            codeContentElement: codeContent,
            rawText,
            languageHint,
            isSettled,
        };
    }
}
