/**
 * Org-Mode Inline Tokenizer
 * Parses bold, italic, underline, strike, code, verbatim, math ($...$, \(...\)),
 * non-href link badges, timestamps, planning cookies, priority cookies, footnotes.
 */

import { InlineToken } from "../types/ast.ts";

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function tokenizeInline(text: string): InlineToken[] {
    if (!text) return [];

    const tokens: InlineToken[] = [];
    let remaining = text;

    while (remaining.length > 0) {
        // LaTeX inline \( ... \)
        const latexParenMatch = remaining.match(/^\\\((.+?)\\\)/s);
        if (latexParenMatch) {
            tokens.push({ type: "latex_inline", value: latexParenMatch[1] });
            remaining = remaining.slice(latexParenMatch[0].length);
            continue;
        }

        // LaTeX inline $...$ (not empty, not starting/ending with space, not a numeric price like $10)
        const latexDollarMatch = remaining.match(/^\$([^\s$](?:[^$]*[^\s$])?)\$/);
        if (latexDollarMatch && !/^\d+(?:\.\d+)?$/.test(latexDollarMatch[1])) {
            tokens.push({ type: "latex_inline", value: latexDollarMatch[1] });
            remaining = remaining.slice(latexDollarMatch[0].length);
            continue;
        }

        // Org Links: [[target][description]] or [[target]] (Rendered as badge text, NO href)
        const linkMatch = remaining.match(/^\[\[([^\]]+)\](?:\[([^\]]+)\])?\]/);
        if (linkMatch) {
            const target = linkMatch[1];
            const description = linkMatch[2] || target;
            tokens.push({
                type: "link",
                value: description,
                target: target,
            });
            remaining = remaining.slice(linkMatch[0].length);
            continue;
        }

        // Planning keywords: DEADLINE:, SCHEDULED:, CLOSED:
        const planMatch = remaining.match(/^(DEADLINE|SCHEDULED|CLOSED):\s*(<[^>]+>|\[[^\]]+\])/i);
        if (planMatch) {
            tokens.push({
                type: "planning",
                value: planMatch[1].toUpperCase(),
                target: planMatch[2],
            });
            remaining = remaining.slice(planMatch[0].length);
            continue;
        }

        // Active timestamp <...>
        const activeTsMatch = remaining.match(/^<(\d{4}-\d{2}-\d{2}[^>]*)>/);
        if (activeTsMatch) {
            tokens.push({ type: "timestamp", value: `<${activeTsMatch[1]}>`, extra: { active: "true" } });
            remaining = remaining.slice(activeTsMatch[0].length);
            continue;
        }

        // Inactive timestamp [...]
        const inactiveTsMatch = remaining.match(/^\[(\d{4}-\d{2}-\d{2}[^\]]*)\]/);
        if (inactiveTsMatch) {
            tokens.push({ type: "timestamp", value: `[${inactiveTsMatch[1]}]`, extra: { active: "false" } });
            remaining = remaining.slice(inactiveTsMatch[0].length);
            continue;
        }

        // Priority [#A]
        const priMatch = remaining.match(/^\[#([A-Z])\]/);
        if (priMatch) {
            tokens.push({ type: "priority", value: priMatch[1] });
            remaining = remaining.slice(priMatch[0].length);
            continue;
        }

        // Statistics cookie [n/m] or [x%]
        const statsMatch = remaining.match(/^\[(\d+\/\d+|\d+%)\]/);
        if (statsMatch) {
            tokens.push({ type: "stats_cookie", value: statsMatch[1] });
            remaining = remaining.slice(statsMatch[0].length);
            continue;
        }

        // Footnote [fn:1] or [fn:label:def]
        const fnMatch = remaining.match(/^\[fn:([^\]:]+)(?::([^\]]+))?\]/);
        if (fnMatch) {
            tokens.push({ type: "footnote", value: fnMatch[1], target: fnMatch[2] });
            remaining = remaining.slice(fnMatch[0].length);
            continue;
        }

        // Inline formatting:
        // Bold: *text*
        const boldMatch = remaining.match(/^\*([^\s*](?:[^*]*?[^\s*])?)\*/);
        if (boldMatch) {
            tokens.push({ type: "bold", value: boldMatch[1] });
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Italic: /text/
        const italicMatch = remaining.match(/^\/([^\s/](?:[^/]*?[^\s/])?)\//);
        if (italicMatch) {
            tokens.push({ type: "italic", value: italicMatch[1] });
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // Underline: _text_
        const underlineMatch = remaining.match(/^_([^\s_](?:[^_]*?[^\s_])?)_/);
        if (underlineMatch) {
            tokens.push({ type: "underline", value: underlineMatch[1] });
            remaining = remaining.slice(underlineMatch[0].length);
            continue;
        }

        // Strike: +text+
        const strikeMatch = remaining.match(/^\+([^\s+](?:[^+]*?[^\s+])?)\+/);
        if (strikeMatch) {
            tokens.push({ type: "strike", value: strikeMatch[1] });
            remaining = remaining.slice(strikeMatch[0].length);
            continue;
        }

        // Verbatim: =text=
        const verbMatch = remaining.match(/^=([^\s=](?:[^=]*?[^\s=])?)=/);
        if (verbMatch) {
            tokens.push({ type: "verbatim", value: verbMatch[1] });
            remaining = remaining.slice(verbMatch[0].length);
            continue;
        }

        // Code: ~text~
        const codeMatch = remaining.match(/^~([^\s~](?:[^~]*?[^\s~])?)~/);
        if (codeMatch) {
            tokens.push({ type: "code", value: codeMatch[1] });
            remaining = remaining.slice(codeMatch[0].length);
            continue;
        }

        // Plain text: advance up to the next special delimiter or planning keyword
        const nextSpecialIndex = remaining.search(/[\\$\[<*/_+=~]|(?:\b(?:DEADLINE|SCHEDULED|CLOSED):)/);
        if (nextSpecialIndex === -1) {
            tokens.push({ type: "text", value: remaining });
            break;
        } else if (nextSpecialIndex === 0) {
            tokens.push({ type: "text", value: remaining[0] });
            remaining = remaining.slice(1);
        } else {
            tokens.push({ type: "text", value: remaining.slice(0, nextSpecialIndex) });
            remaining = remaining.slice(nextSpecialIndex);
        }
    }

    return tokens;
}
