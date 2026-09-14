import { DUCKAI_SELECTORS } from "./selectors.ts";
import type { DuckAiCodeBlockRef } from "./types.ts";
import type { ResponseSegment } from "@internal/contracts/core";
import { defaultMatcherRegistry } from "@internal/registries";
import { createLogger } from "@internal/core/logging";

export class DuckAiScraper {
    private logger = createLogger("DuckAi > Scraper");

    /**
     * Extracts raw code text directly from the pre > code element.
     * In Duck.ai, line numbers are generated via CSS pseudo-elements (before:content-[counter(line)]),
     * so codeElement.textContent yields the authentic source text without regex stripping.
     */
    public extractCodeText(codeBlockElement: HTMLElement): string {
        const codeEl = codeBlockElement.querySelector<HTMLElement>(DUCKAI_SELECTORS.CODE_CONTENT);
        if (!codeEl) {
            this.logger.warn(`Code content element missing for selector: ${DUCKAI_SELECTORS.CODE_CONTENT}`);
        }
        return codeEl?.textContent ?? "";
    }

    /**
     * Extracts the raw language hint from data-language attribute or header text.
     */
    public extractLanguageHint(codeBlockElement: HTMLElement): string {
        const attrHint = codeBlockElement.getAttribute(DUCKAI_SELECTORS.LANGUAGE_ATTR)?.trim().toLowerCase();
        if (attrHint) return attrHint;

        const headerSpan = codeBlockElement.querySelector<HTMLElement>(DUCKAI_SELECTORS.CODE_HEADER);
        const headerText = headerSpan?.textContent?.trim().toLowerCase();
        return headerText || "plaintext";
    }

    /**
     * Checks whether the turn containing this element is settled.
     * Settled = MESSAGE_ACTIONS is mounted and STOP_GENERATING_BUTTON is absent.
     */
    public isTurnCompleted(element: HTMLElement): boolean {
        // Search inside container or document
        const assistantMsg = element.closest<HTMLElement>(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) ??
            (element.matches(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) ? element : null);

        if (!assistantMsg) {
            const hasActions = !!element.querySelector(DUCKAI_SELECTORS.MESSAGE_ACTIONS);
            const isGenerating = !!element.querySelector(DUCKAI_SELECTORS.STOP_GENERATING_BUTTON);
            return hasActions && !isGenerating;
        }

        const hasActions = !!assistantMsg.querySelector(DUCKAI_SELECTORS.MESSAGE_ACTIONS);
        const doc = element.ownerDocument ?? (typeof document !== "undefined" ? document : null);
        const isGenerating = doc ? !!doc.querySelector(DUCKAI_SELECTORS.STOP_GENERATING_BUTTON) : false;
        return hasActions && !isGenerating;
    }

    /**
     * Extracts a stable turn identifier from the assistant message container ID.
     */
    public getTurnId(element: HTMLElement): string {
        const assistantMsg = element.closest<HTMLElement>(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) ??
            (element.matches(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) ? element : null);

        if (assistantMsg?.id) {
            return assistantMsg.id;
        }

        return `duckai-turn-${Math.random().toString(36).slice(2, 9)}`;
    }

    /**
     * Parses a div[data-streamdown="code-block"] into a DuckAiCodeBlockRef.
     * Resolves the canonical formatId through defaultMatcherRegistry with zero rematching.
     */
    public parseCodeBlock(codeBlockElement: HTMLElement): DuckAiCodeBlockRef | null {
        const codeElement = codeBlockElement.querySelector<HTMLElement>(DUCKAI_SELECTORS.CODE_CONTENT);
        if (!codeElement) {
            this.logger.warn(
                `Found code-block but missing child ${DUCKAI_SELECTORS.CODE_CONTENT} (potential selector drift)`,
            );
            return null;
        }

        const rawCode = codeElement.textContent ?? "";
        const rawHint = this.extractLanguageHint(codeBlockElement);
        const lines = rawCode.split("\n");

        // Canonical Format ID Pipeline
        const match = defaultMatcherRegistry.findMatching(rawHint, lines);
        const formatId = match?.id ?? "raw";
        const displayName = match?.name ?? (rawHint || "Plain Text");

        const id = codeBlockElement.dataset.extBlockId ||
            `duckai-block-${Math.random().toString(36).slice(2, 9)}`;
        codeBlockElement.dataset.extBlockId = id;

        const isSettled = this.isTurnCompleted(codeBlockElement);

        return {
            id,
            hostElement: codeBlockElement,
            codeElement,
            rawCode,
            rawHint,
            formatId,
            displayName,
            isSettled,
        };
    }

    /**
     * Extracts structured ResponseSegment items from an assistant message element,
     * identifying code blocks, MathML equations, tables, and prose paragraphs.
     */
    public extractTurnSegments(responseElement: HTMLElement): ResponseSegment[] {
        const segments: ResponseSegment[] = [];

        // Query all structural direct or nested children of interest
        const structuralElements = responseElement.querySelectorAll<HTMLElement>(
            `${DUCKAI_SELECTORS.CODE_BLOCK}, ${DUCKAI_SELECTORS.TABLE_REGION}, ${DUCKAI_SELECTORS.TABLE}, p, ${DUCKAI_SELECTORS.KATEX_MATH}`,
        );

        const visitedElements = new Set<HTMLElement>();

        for (const el of Array.from(structuralElements)) {
            if (visitedElements.has(el)) continue;

            if (el.matches(DUCKAI_SELECTORS.CODE_BLOCK)) {
                visitedElements.add(el);
                const blockRef = this.parseCodeBlock(el);
                if (blockRef) {
                    segments.push({
                        type: "code-block",
                        content: blockRef.rawCode,
                        language: blockRef.rawHint || blockRef.formatId,
                        metadata: {
                            formatId: blockRef.formatId,
                            displayName: blockRef.displayName,
                            rawHint: blockRef.rawHint,
                            id: blockRef.id,
                        },
                    });
                }
            } else if (el.matches(DUCKAI_SELECTORS.TABLE_REGION) || el.matches(DUCKAI_SELECTORS.TABLE)) {
                // Skip if parent table region already processed
                const parentRegion = el.closest<HTMLElement>(DUCKAI_SELECTORS.TABLE_REGION);
                const target = parentRegion ?? el;
                if (!visitedElements.has(target)) {
                    visitedElements.add(target);
                    segments.push({
                        type: "prose",
                        content: target.outerHTML,
                        metadata: { kind: "table" },
                    });
                }
            } else if (el.matches(DUCKAI_SELECTORS.KATEX_MATH)) {
                // Only process standalone / display math or if not enclosed in already processed code block
                if (el.closest(DUCKAI_SELECTORS.CODE_BLOCK)) continue;
                visitedElements.add(el);
                const mathMlAnnotation = el.querySelector<HTMLElement>(DUCKAI_SELECTORS.MATHML_TEX_ANNOTATION);
                const latex = mathMlAnnotation?.textContent?.trim() ?? el.textContent?.trim() ?? "";
                segments.push({
                    type: "prose",
                    content: latex,
                    metadata: { kind: "math", latex },
                });
            } else if (el.tagName.toLowerCase() === "p") {
                if (el.closest(DUCKAI_SELECTORS.CODE_BLOCK) || el.closest(DUCKAI_SELECTORS.TABLE_REGION)) continue;
                visitedElements.add(el);
                const text = el.textContent?.trim() ?? "";
                if (text) {
                    segments.push({
                        type: "prose",
                        content: text,
                    });
                }
            }
        }

        return segments;
    }
}
