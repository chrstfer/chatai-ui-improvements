import type {
    OrgBoldObject,
    OrgCodeObject,
    OrgItalicObject,
    OrgLinkObject,
    OrgMacroObject,
    OrgObject,
    OrgStatisticsCookieObject,
    OrgStrikeObject,
    OrgUnderlineObject,
    OrgVerbatimObject,
} from "./types.ts";
import { tokenizeMathSpans } from "../math/index.ts";

/**
 * Common LaTeX Greek and math entities frequently used in Org-mode documents
 * (per ADR 0001: KaTeX Math and LaTeX Greek Rendering Pipeline).
 */
const KNOWN_ENTITIES: ReadonlySet<string> = new Set([
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "varepsilon",
    "zeta",
    "eta",
    "theta",
    "vartheta",
    "iota",
    "kappa",
    "lambda",
    "mu",
    "nu",
    "xi",
    "pi",
    "varpi",
    "rho",
    "varrho",
    "sigma",
    "varsigma",
    "tau",
    "upsilon",
    "phi",
    "varphi",
    "chi",
    "psi",
    "omega",
    "Gamma",
    "Delta",
    "Theta",
    "Lambda",
    "Xi",
    "Pi",
    "Sigma",
    "Upsilon",
    "Phi",
    "Psi",
    "Omega",
    "to",
    "rightarrow",
    "leftarrow",
    "implies",
    "iff",
    "in",
    "subset",
    "infty",
    "pm",
    "approx",
    "times",
    "cdot",
]);

/**
 * Checks whether a character at a given position can precede an Org emphasis marker.
 * Org boundary rule: must be start of line, whitespace, or punctuation: - ( { ' "
 */
function isValidPreChar(text: string, index: number): boolean {
    if (index === 0) return true;
    const char = text[index - 1];
    return /\s|[-({'"/]/.test(char);
}

/**
 * Checks whether a character following an Org emphasis closing marker is valid.
 * Org boundary rule: must be end of text, whitespace, or punctuation: - . , ; : ! ? ' " ) } /
 */
function isValidPostChar(text: string, index: number): boolean {
    if (index >= text.length) return true;
    const char = text[index];
    return /\s|[-.,;:!?'"\\)/}]/.test(char);
}

/**
 * Parses a non-math prose text slice into OrgObject nodes.
 * Executes Phase 2 of two-phase math tokenization: entity expansion, links, macros,
 * statistics cookies, emphasis markers, and line breaks are applied strictly to prose.
 */
function parseOrgProse(text: string, result: OrgObject[]): void {
    let cursor = 0;
    let textBuffer = "";

    function flushText() {
        if (textBuffer.length > 0) {
            result.push({ type: "text", value: textBuffer });
            textBuffer = "";
        }
    }

    while (cursor < text.length) {
        // 1. Forced Line Break (\\)
        if (text.startsWith("\\\\", cursor)) {
            const nextChar = text[cursor + 2];
            if (nextChar === undefined || nextChar === "\n" || nextChar === "\r" || nextChar === " ") {
                flushText();
                result.push({ type: "line_break" });
                cursor += 2;
                if (text[cursor] === " " && (text[cursor + 1] === "\n" || text[cursor + 1] === "\r")) {
                    cursor++;
                }
                continue;
            }
        }

        // 2. Links: [[target][description]] or [[target]]
        if (text.startsWith("[[", cursor)) {
            const linkClose = text.indexOf("]]", cursor + 2);
            if (linkClose !== -1) {
                const linkBody = text.slice(cursor + 2, linkClose);
                flushText();

                const descSplit = linkBody.indexOf("][");
                if (descSplit !== -1) {
                    const url = linkBody.slice(0, descSplit);
                    const descText = linkBody.slice(descSplit + 2);
                    const linkNode: OrgLinkObject = {
                        type: "link",
                        url,
                        description: parseOrgInline(descText),
                    };
                    result.push(linkNode);
                } else {
                    const linkNode: OrgLinkObject = {
                        type: "link",
                        url: linkBody,
                    };
                    result.push(linkNode);
                }

                cursor = linkClose + 2;
                continue;
            }
        }

        // 3. Macros: {{{name(args)}}} or {{{name}}}
        if (text.startsWith("{{{", cursor)) {
            const macroClose = text.indexOf("}}}", cursor + 3);
            if (macroClose !== -1) {
                const macroInner = text.slice(cursor + 3, macroClose);
                const match = macroInner.match(/^([a-zA-Z0-9_-]+)(?:\((.*?)\))?$/);
                if (match) {
                    flushText();
                    const name = match[1];
                    const args = match[2] ? match[2].split(",").map((s) => s.trim()) : [];
                    const macroNode: OrgMacroObject = {
                        type: "macro",
                        name,
                        args,
                        raw: text.slice(cursor, macroClose + 3),
                    };
                    result.push(macroNode);
                    cursor = macroClose + 3;
                    continue;
                }
            }
        }

        // 4. Statistics Cookies: [1/3] or [33%]
        if (text[cursor] === "[" && isValidPreChar(text, cursor)) {
            const cookieMatch = text.slice(cursor).match(/^\[(?:(\d+)\/(\d+)|(\d+)%)\]/);
            if (cookieMatch) {
                flushText();
                const raw = cookieMatch[0];
                const cookieNode: OrgStatisticsCookieObject = {
                    type: "statistics_cookie",
                    value: raw,
                };
                if (cookieMatch[1] !== undefined && cookieMatch[2] !== undefined) {
                    cookieNode.current = parseInt(cookieMatch[1], 10);
                    cookieNode.total = parseInt(cookieMatch[2], 10);
                    if (cookieNode.total > 0) {
                        cookieNode.percent = Math.round((cookieNode.current / cookieNode.total) * 100);
                    }
                } else if (cookieMatch[3] !== undefined) {
                    cookieNode.percent = parseInt(cookieMatch[3], 10);
                }
                result.push(cookieNode);
                cursor += raw.length;
                continue;
            }
        }

        // 5. LaTeX Entities (\alpha, \sigma, \to, etc.) - executed exclusively on prose
        if (text[cursor] === "\\") {
            const entityMatch = text.slice(cursor).match(/^\\([a-zA-Z]+)/);
            if (entityMatch && KNOWN_ENTITIES.has(entityMatch[1])) {
                const rawEntity = entityMatch[0];
                const postCharIdx = cursor + rawEntity.length;
                if (isValidPostChar(text, postCharIdx)) {
                    flushText();
                    result.push({
                        type: "entity",
                        name: entityMatch[1],
                        latex: rawEntity,
                    });
                    cursor = postCharIdx;
                    continue;
                }
            }
        }

        // 6. Org Emphasis Markers (*bold*, /italic/, _underline_, +strike+, ~code~, =verbatim=)
        const char = text[cursor];
        const isEmphasisMarker = char === "*" || char === "/" || char === "_" || char === "+" || char === "~" ||
            char === "=";

        if (isEmphasisMarker && isValidPreChar(text, cursor)) {
            const nextChar = text[cursor + 1];
            if (nextChar && !/\s/.test(nextChar) && nextChar !== char) {
                let closeIdx = -1;
                for (let i = cursor + 2; i < text.length; i++) {
                    if (text[i] === "\n") break;
                    if (text[i] === char && !/\s/.test(text[i - 1]) && isValidPostChar(text, i + 1)) {
                        closeIdx = i;
                        break;
                    }
                }

                if (closeIdx !== -1) {
                    const innerText = text.slice(cursor + 1, closeIdx);
                    flushText();

                    switch (char) {
                        case "*":
                            result.push({
                                type: "bold",
                                children: parseOrgInline(innerText),
                            } as OrgBoldObject);
                            break;
                        case "/":
                            result.push({
                                type: "italic",
                                children: parseOrgInline(innerText),
                            } as OrgItalicObject);
                            break;
                        case "_":
                            result.push({
                                type: "underline",
                                children: parseOrgInline(innerText),
                            } as OrgUnderlineObject);
                            break;
                        case "+":
                            result.push({
                                type: "strike",
                                children: parseOrgInline(innerText),
                            } as OrgStrikeObject);
                            break;
                        case "~":
                            result.push({
                                type: "code",
                                value: innerText,
                            } as OrgCodeObject);
                            break;
                        case "=":
                            result.push({
                                type: "verbatim",
                                value: innerText,
                            } as OrgVerbatimObject);
                            break;
                    }

                    cursor = closeIdx + 1;
                    continue;
                }
            }
        }

        // 7. Subscript (a_b or a_{foo}) & Superscript (a^b or a^{foo})
        if ((char === "_" || char === "^") && cursor > 0 && /\w/.test(text[cursor - 1])) {
            const isSub = char === "_";
            const rest = text.slice(cursor + 1);
            const bracketMatch = rest.match(/^\{([^}]+)\}/);
            const singleMatch = rest.match(/^([a-zA-Z0-9]+)/);

            if (bracketMatch) {
                flushText();
                const inner = bracketMatch[1];
                const node = isSub
                    ? { type: "subscript" as const, value: parseOrgInline(inner) }
                    : { type: "superscript" as const, value: parseOrgInline(inner) };
                result.push(node);
                cursor += 1 + bracketMatch[0].length;
                continue;
            } else if (singleMatch) {
                flushText();
                const inner = singleMatch[1];
                const node = isSub
                    ? { type: "subscript" as const, value: inner }
                    : { type: "superscript" as const, value: inner };
                result.push(node);
                cursor += 1 + singleMatch[0].length;
                continue;
            }
        }

        // Accumulate plain character into textBuffer
        textBuffer += char;
        cursor++;
    }

    flushText();
}

/**
 * Parses an inline text run into an array of strongly-typed OrgObject nodes.
 *
 * Implements Two-Phase Math Tokenization:
 * - Phase 1: Delimits and shields LaTeX math spans ($...$, \(...\), $$...$$, \[...\], \begin{equation}...\end{equation})
 *   into immutable AST tokens upfront.
 * - Phase 2: Performs Greek entity expansion (\lambda), formatting markers (*bold*, /italic/),
 *   links, macros, and cookies strictly across non-math prose.
 *
 * @param text - Raw inline string to parse
 * @returns Array of OrgObject nodes
 */
export function parseOrgInline(text: string): OrgObject[] {
    if (!text) return [];

    // Phase 1: Delimit and shield LaTeX math spans into immutable tokens first
    const slices = tokenizeMathSpans(text);
    const result: OrgObject[] = [];

    for (const slice of slices) {
        if (slice.type === "math") {
            result.push({
                type: "latex_fragment",
                value: slice.raw,
                isDisplay: slice.isDisplay,
            });
        } else {
            // Phase 2: Parse non-math prose (links, macros, cookies, entities, emphasis)
            parseOrgProse(slice.text, result);
        }
    }

    return result;
}
