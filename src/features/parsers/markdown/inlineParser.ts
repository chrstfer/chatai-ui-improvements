/**
 * Headless CommonMark + GFM Inline Phrasing Tokenizer.
 * Delimits and shields LaTeX math spans before inline formatting, links, and code spans.
 */

import { tokenizeMathSpans } from "../math/index.ts";
import type {
    MarkdownCodeSpanNode,
    MarkdownEmphasisNode,
    MarkdownImageNode,
    MarkdownInlineNode,
    MarkdownLinkNode,
    MarkdownMathInlineNode,
    MarkdownTextNode,
} from "./types.ts";

function parseProseInline(text: string, result: MarkdownInlineNode[]): void {
    let cursor = 0;
    let textBuffer = "";

    function flushText() {
        if (textBuffer.length > 0) {
            result.push({ type: "text", value: textBuffer });
            textBuffer = "";
        }
    }

    while (cursor < text.length) {
        // 1. Inline Code: `code`
        if (text[cursor] === "`") {
            const closeIdx = text.indexOf("`", cursor + 1);
            if (closeIdx !== -1) {
                flushText();
                const code = text.slice(cursor + 1, closeIdx);
                result.push({
                    type: "inline_code",
                    value: code,
                    code,
                } as MarkdownCodeSpanNode);
                cursor = closeIdx + 1;
                continue;
            }
        }

        // 2. Images: ![alt](url "title")
        if (text.startsWith("![", cursor)) {
            const bracketClose = text.indexOf("](", cursor + 2);
            if (bracketClose !== -1) {
                const parenClose = text.indexOf(")", bracketClose + 2);
                if (parenClose !== -1) {
                    flushText();
                    const alt = text.slice(cursor + 2, bracketClose);
                    const linkBody = text.slice(bracketClose + 2, parenClose).trim();
                    const titleMatch = linkBody.match(/^(.*?)\s+["'](.*)["']$/);
                    const url = titleMatch ? titleMatch[1].trim() : linkBody;
                    const title = titleMatch ? titleMatch[2] : undefined;

                    result.push({
                        type: "image",
                        url,
                        alt,
                        title,
                    } as MarkdownImageNode);
                    cursor = parenClose + 1;
                    continue;
                }
            }
        }

        // 3. Links: [text](url "title")
        if (text[cursor] === "[") {
            const bracketClose = text.indexOf("](", cursor + 1);
            if (bracketClose !== -1) {
                const parenClose = text.indexOf(")", bracketClose + 2);
                if (parenClose !== -1) {
                    flushText();
                    const linkText = text.slice(cursor + 1, bracketClose);
                    const linkBody = text.slice(bracketClose + 2, parenClose).trim();
                    const titleMatch = linkBody.match(/^(.*?)\s+["'](.*)["']$/);
                    const url = titleMatch ? titleMatch[1].trim() : linkBody;
                    const title = titleMatch ? titleMatch[2] : undefined;

                    result.push({
                        type: "link",
                        url,
                        title,
                        children: parseMarkdownInline(linkText),
                    } as MarkdownLinkNode);
                    cursor = parenClose + 1;
                    continue;
                }
            }
        }

        // 4. Strikethrough: ~~deleted~~
        if (text.startsWith("~~", cursor)) {
            const closeIdx = text.indexOf("~~", cursor + 2);
            if (closeIdx !== -1) {
                flushText();
                const inner = text.slice(cursor + 2, closeIdx);
                result.push({
                    type: "emphasis",
                    kind: "strikethrough",
                    children: parseMarkdownInline(inner),
                } as MarkdownEmphasisNode);
                cursor = closeIdx + 2;
                continue;
            }
        }

        // 5. Bold: **text** or __text__
        if (text.startsWith("**", cursor) || text.startsWith("__", cursor)) {
            const marker = text.slice(cursor, cursor + 2);
            const closeIdx = text.indexOf(marker, cursor + 2);
            if (closeIdx !== -1) {
                flushText();
                const inner = text.slice(cursor + 2, closeIdx);
                result.push({
                    type: "emphasis",
                    kind: "bold",
                    children: parseMarkdownInline(inner),
                } as MarkdownEmphasisNode);
                cursor = closeIdx + 2;
                continue;
            }
        }

        // 6. Italic: *text* or _text_
        if (text[cursor] === "*" || text[cursor] === "_") {
            const marker = text[cursor];
            const nextChar = text[cursor + 1];
            if (nextChar && nextChar !== " " && nextChar !== "\n" && nextChar !== marker) {
                let closeIdx = -1;
                for (let i = cursor + 1; i < text.length; i++) {
                    if (text[i] === "\n") break;
                    if (text[i] === marker && text[i - 1] !== " " && text[i - 1] !== "\\") {
                        closeIdx = i;
                        break;
                    }
                }
                if (closeIdx !== -1) {
                    flushText();
                    const inner = text.slice(cursor + 1, closeIdx);
                    result.push({
                        type: "emphasis",
                        kind: "italic",
                        children: parseMarkdownInline(inner),
                    } as MarkdownEmphasisNode);
                    cursor = closeIdx + 1;
                    continue;
                }
            }
        }

        textBuffer += text[cursor];
        cursor++;
    }

    flushText();
}

/**
 * Tokenizes a raw markdown inline phrasing string into MarkdownInlineNode items.
 * Enforces Two-Phase math shielding before inline formatting passes.
 *
 * @param text - Raw inline text to parse
 * @returns Array of strongly typed MarkdownInlineNode elements
 */
export function parseMarkdownInline(text: string): MarkdownInlineNode[] {
    if (!text) return [];

    // Phase 1: Shield math spans ($...$, \(...\))
    const slices = tokenizeMathSpans(text, {
        allowEnvironments: false,
        allowBrackets: false,
        allowDoubleDollar: false,
    });
    const result: MarkdownInlineNode[] = [];

    for (const slice of slices) {
        if (slice.type === "math") {
            result.push({
                type: "inline_math",
                formula: slice.formula,
                raw: slice.raw,
            } as MarkdownMathInlineNode);
        } else {
            // Phase 2: Prose formatting (emphasis, links, code spans, text)
            parseProseInline(slice.text, result);
        }
    }

    return result;
}
