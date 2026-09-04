/**
 * CommonMark & GFM Markdown Inline Tokenizer
 */

import { MarkdownInlineNode } from "../types/ast.ts";

export function tokenizeMarkdownInline(text: string): MarkdownInlineNode[] {
    if (!text) return [];

    const nodes: MarkdownInlineNode[] = [];
    let i = 0;
    const len = text.length;
    let textBuffer = "";

    const flushText = () => {
        if (textBuffer) {
            nodes.push({ type: "text", value: textBuffer });
            textBuffer = "";
        }
    };

    while (i < len) {
        // Inline Math: $$...$$, $...$, \(...\), \[...\]
        if (text[i] === "$" || (text[i] === "\\" && (text[i + 1] === "(" || text[i + 1] === "["))) {
            const isDoubleDollar = text[i] === "$" && text[i + 1] === "$";
            const isParenMath = text[i] === "\\" && text[i + 1] === "(";
            const isBracketMath = text[i] === "\\" && text[i + 1] === "[";

            if (isDoubleDollar) {
                const end = text.indexOf("$$", i + 2);
                if (end !== -1) {
                    flushText();
                    nodes.push({
                        type: "math_inline",
                        math: text.slice(i + 2, end).trim(),
                        display: true,
                    });
                    i = end + 2;
                    continue;
                }
            } else if (isParenMath) {
                const end = text.indexOf("\\)", i + 2);
                if (end !== -1) {
                    flushText();
                    nodes.push({
                        type: "math_inline",
                        math: text.slice(i + 2, end).trim(),
                        display: false,
                    });
                    i = end + 2;
                    continue;
                }
            } else if (isBracketMath) {
                const end = text.indexOf("\\]", i + 2);
                if (end !== -1) {
                    flushText();
                    nodes.push({
                        type: "math_inline",
                        math: text.slice(i + 2, end).trim(),
                        display: true,
                    });
                    i = end + 2;
                    continue;
                }
            } else if (text[i] === "$") {
                // Ensure not preceded by non-escaped alphanumeric or followed immediately by space
                const nextChar = text[i + 1];
                if (nextChar && nextChar !== " " && nextChar !== "$") {
                    const end = text.indexOf("$", i + 1);
                    if (end !== -1 && text[end - 1] !== " ") {
                        flushText();
                        nodes.push({
                            type: "math_inline",
                            math: text.slice(i + 1, end),
                            display: false,
                        });
                        i = end + 1;
                        continue;
                    }
                }
            }
        }

        // Escaped character: \* or \_ etc.
        if (text[i] === "\\" && i + 1 < len) {
            const nextChar = text[i + 1];
            if (/[\*_`~\[\]\(\)\$\\#\+\-\.!]/.test(nextChar)) {
                textBuffer += nextChar;
                i += 2;
                continue;
            }
        }

        // Inline Code: `code` or ``code``
        if (text[i] === "`") {
            let backtickCount = 1;
            while (i + backtickCount < len && text[i + backtickCount] === "`") {
                backtickCount++;
            }
            const delimiter = "`".repeat(backtickCount);
            const end = text.indexOf(delimiter, i + backtickCount);
            if (end !== -1) {
                flushText();
                const codeVal = text.slice(i + backtickCount, end);
                nodes.push({
                    type: "code_inline",
                    value: codeVal,
                });
                i = end + backtickCount;
                continue;
            }
        }

        // Links: [text](url "title") or [text](url)
        if (text[i] === "[") {
            const closingBracket = text.indexOf("]", i + 1);
            if (closingBracket !== -1 && text[closingBracket + 1] === "(") {
                const closingParen = text.indexOf(")", closingBracket + 2);
                if (closingParen !== -1) {
                    flushText();
                    const linkText = text.slice(i + 1, closingBracket);
                    const linkTargetRaw = text.slice(closingBracket + 2, closingParen).trim();
                    let href = linkTargetRaw;
                    let title: string | undefined;

                    const titleMatch = linkTargetRaw.match(/^([^\s]+)\s+["'](.*)["']$/);
                    if (titleMatch) {
                        href = titleMatch[1];
                        title = titleMatch[2];
                    }

                    nodes.push({
                        type: "link",
                        text: linkText,
                        href,
                        title,
                        children: tokenizeMarkdownInline(linkText),
                    });
                    i = closingParen + 1;
                    continue;
                }
            }
        }

        // Bold Italic: ***text*** or ___text___
        if ((text.startsWith("***", i) || text.startsWith("___", i))) {
            const delim = text.slice(i, i + 3);
            const end = text.indexOf(delim, i + 3);
            if (end !== -1) {
                flushText();
                const inner = text.slice(i + 3, end);
                nodes.push({
                    type: "bold_italic",
                    children: tokenizeMarkdownInline(inner),
                });
                i = end + 3;
                continue;
            }
        }

        // Bold: **text** or __text__
        if (text.startsWith("**", i) || text.startsWith("__", i)) {
            const delim = text.slice(i, i + 2);
            const end = text.indexOf(delim, i + 2);
            if (end !== -1) {
                flushText();
                const inner = text.slice(i + 2, end);
                nodes.push({
                    type: "bold",
                    children: tokenizeMarkdownInline(inner),
                });
                i = end + 2;
                continue;
            }
        }

        // Strikethrough: ~~text~~
        if (text.startsWith("~~", i)) {
            const end = text.indexOf("~~", i + 2);
            if (end !== -1) {
                flushText();
                const inner = text.slice(i + 2, end);
                nodes.push({
                    type: "strike",
                    children: tokenizeMarkdownInline(inner),
                });
                i = end + 2;
                continue;
            }
        }

        // Italic: *text* or _text_
        if ((text[i] === "*" || text[i] === "_") && i + 1 < len && text[i + 1] !== " ") {
            const delim = text[i];
            const end = text.indexOf(delim, i + 1);
            if (end !== -1 && text[end - 1] !== " ") {
                flushText();
                const inner = text.slice(i + 1, end);
                nodes.push({
                    type: "italic",
                    children: tokenizeMarkdownInline(inner),
                });
                i = end + 1;
                continue;
            }
        }

        // Regular character
        textBuffer += text[i];
        i++;
    }

    flushText();
    return nodes;
}
