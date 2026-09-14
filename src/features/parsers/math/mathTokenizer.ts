/**
 * Headless LaTeX Math Tokenizer implementation.
 * Delimits and shields inline and display mathematical expressions before prose entity expansion.
 *
 * Adheres strictly to Pandoc/KaTeX border constraints and Phase 3 Stage 3 specifications.
 */

import type { MathDelimiterType, MathSlice, MathSpanSlice, MathTokenizerOptions, ProseSlice } from "./types.ts";

function isValidPreChar(char: string | undefined): boolean {
    if (char === undefined) return true;
    return /\s|[-({'"/\[]/.test(char);
}

function isValidPostChar(char: string | undefined): boolean {
    if (char === undefined) return true;
    return /\s|[-.,;:!?'"\\)/}\]]/.test(char);
}

/**
 * Tokenizes a string into an alternating sequence of shielded math spans and non-math prose slices.
 *
 * @param text - Raw text to tokenize
 * @param options - Optional configuration for enabled delimiters
 * @returns Array of MathSlice objects (discriminated by type: "math" | "prose")
 */
export function tokenizeMathSpans(
    text: string,
    options: MathTokenizerOptions = {},
): MathSlice[] {
    if (!text) return [];

    const {
        allowSingleDollar = true,
        allowDoubleDollar = true,
        allowParentheses = true,
        allowBrackets = true,
        allowEnvironments = true,
    } = options;

    const slices: MathSlice[] = [];
    let cursor = 0;
    let proseBufferStart = 0;

    function flushProse(endIdx: number) {
        if (endIdx > proseBufferStart) {
            slices.push({
                type: "prose",
                text: text.slice(proseBufferStart, endIdx),
                start: proseBufferStart,
                end: endIdx,
            });
        }
    }

    while (cursor < text.length) {
        // 1. Escaped Dollar (\$) -> Treat as literal prose to prevent math matching
        if (text[cursor] === "\\" && text[cursor + 1] === "$") {
            cursor += 2;
            continue;
        }

        // 2. Display Environments: \begin{equation}... or \begin{align}...
        if (allowEnvironments && text.startsWith("\\begin{", cursor)) {
            const envMatch = text.slice(cursor).match(/^\\begin\{(equation|align)\*?\}/);
            if (envMatch) {
                const envName = envMatch[1];
                const closeTag = `\\end{${envName}}`;
                const closeTagStar = `\\end{${envName}*}`;
                let closeIdx = text.indexOf(closeTag, cursor + envMatch[0].length);
                let closeTagLen = closeTag.length;
                if (closeIdx === -1) {
                    closeIdx = text.indexOf(closeTagStar, cursor + envMatch[0].length);
                    closeTagLen = closeTagStar.length;
                }

                if (closeIdx !== -1) {
                    const mathEnd = closeIdx + closeTagLen;
                    flushProse(cursor);
                    const raw = text.slice(cursor, mathEnd);
                    const formula = text.slice(cursor + envMatch[0].length, closeIdx).trim();
                    slices.push({
                        type: "math",
                        raw,
                        formula: formula.length > 0 ? formula : raw,
                        isDisplay: true,
                        delimiter: envName as MathDelimiterType,
                        start: cursor,
                        end: mathEnd,
                    });
                    cursor = mathEnd;
                    proseBufferStart = cursor;
                    continue;
                }
            }
        }

        // 3. Display Brackets: \[ ... \]
        if (allowBrackets && text.startsWith("\\[", cursor)) {
            const closeIdx = text.indexOf("\\]", cursor + 2);
            if (closeIdx !== -1) {
                const mathEnd = closeIdx + 2;
                flushProse(cursor);
                const raw = text.slice(cursor, mathEnd);
                const formula = text.slice(cursor + 2, closeIdx).trim();
                slices.push({
                    type: "math",
                    raw,
                    formula,
                    isDisplay: true,
                    delimiter: "\\[",
                    start: cursor,
                    end: mathEnd,
                });
                cursor = mathEnd;
                proseBufferStart = cursor;
                continue;
            }
        }

        // 4. Inline Parentheses: \( ... \)
        if (allowParentheses && text.startsWith("\\(", cursor)) {
            const closeIdx = text.indexOf("\\)", cursor + 2);
            if (closeIdx !== -1) {
                const mathEnd = closeIdx + 2;
                flushProse(cursor);
                const raw = text.slice(cursor, mathEnd);
                const formula = text.slice(cursor + 2, closeIdx).trim();
                slices.push({
                    type: "math",
                    raw,
                    formula,
                    isDisplay: false,
                    delimiter: "\\(",
                    start: cursor,
                    end: mathEnd,
                });
                cursor = mathEnd;
                proseBufferStart = cursor;
                continue;
            }
        }

        // 5. Display Double Dollar: $$ ... $$
        if (allowDoubleDollar && text.startsWith("$$", cursor)) {
            const closeIdx = text.indexOf("$$", cursor + 2);
            if (closeIdx !== -1) {
                const mathEnd = closeIdx + 2;
                flushProse(cursor);
                const raw = text.slice(cursor, mathEnd);
                const formula = text.slice(cursor + 2, closeIdx).trim();
                slices.push({
                    type: "math",
                    raw,
                    formula,
                    isDisplay: true,
                    delimiter: "$$",
                    start: cursor,
                    end: mathEnd,
                });
                cursor = mathEnd;
                proseBufferStart = cursor;
                continue;
            }
        }

        // 6. Inline Dollar: $ ... $
        if (allowSingleDollar && text[cursor] === "$") {
            const prevChar = cursor > 0 ? text[cursor - 1] : undefined;
            const nextChar = cursor + 1 < text.length ? text[cursor + 1] : undefined;

            if (isValidPreChar(prevChar) && nextChar && nextChar !== " " && nextChar !== "\n" && nextChar !== "$") {
                let closeIdx = -1;
                for (let i = cursor + 1; i < text.length; i++) {
                    if (text[i] === "\n") break; // Inline math cannot span multiple lines
                    if (text[i] === "$" && text[i - 1] !== "\\") {
                        const charBeforeClose = text[i - 1];
                        const charAfterClose = i + 1 < text.length ? text[i + 1] : undefined;
                        // Closing $ cannot be preceded by whitespace, and cannot be followed immediately by a digit (currency protection)
                        if (
                            charBeforeClose !== " " && charBeforeClose !== "\t" &&
                            (charAfterClose === undefined || !/[0-9]/.test(charAfterClose)) &&
                            isValidPostChar(charAfterClose)
                        ) {
                            closeIdx = i;
                            break;
                        }
                    }
                }

                if (closeIdx !== -1) {
                    const mathEnd = closeIdx + 1;
                    flushProse(cursor);
                    const raw = text.slice(cursor, mathEnd);
                    const formula = text.slice(cursor + 1, closeIdx);
                    slices.push({
                        type: "math",
                        raw,
                        formula,
                        isDisplay: false,
                        delimiter: "$",
                        start: cursor,
                        end: mathEnd,
                    });
                    cursor = mathEnd;
                    proseBufferStart = cursor;
                    continue;
                }
            }
        }

        cursor++;
    }

    flushProse(text.length);
    return slices;
}
