/**
 * Headless CommonMark & GitHub Flavored Markdown (GFM) Block Parser.
 *
 * Implements a streaming, single-pass line-by-line block scanner:
 * - ATX Headings with automated slug generation and section hierarchy nesting.
 * - Fenced code blocks capturing lang, code, fenceChar, and fenceLength.
 * - GitHub Alert Callouts (> [!NOTE], [!TIP], etc.) with normalized variants and custom titles.
 * - GFM Pipe Tables with delimiter row alignment parsing and lenient column normalization.
 * - Ordered and unordered task lists with checked booleans.
 * - Thematic breaks and display math environments ($$, \begin{equation}).
 *
 * Adheres to AstNode base contracts in src/contracts/features/parsers/.
 */

import type {
    MarkdownAlertNode,
    MarkdownAlertVariant,
    MarkdownBlockNode,
    MarkdownBlockquoteNode,
    MarkdownCodeBlockNode,
    MarkdownHeadingNode,
    MarkdownListItemNode,
    MarkdownListNode,
    MarkdownMathDisplayBlockNode,
    MarkdownParagraphNode,
    MarkdownSectionNode,
    MarkdownTableAlignment,
    MarkdownTableCellNode,
    MarkdownTableNode,
    MarkdownTableRowNode,
    MarkdownThematicBreakNode,
} from "./types.ts";
import { parseMarkdownInline } from "./inlineParser.ts";

/** Converts heading text into a URL-friendly, lowercase kebab-case slug. */
export function slugifyHeading(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const ALERT_REGEX = /^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s+(.*))?$/i;
const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;
const FENCE_START_REGEX = /^([`~]{3,})(.*)$/;
const THEMATIC_BREAK_REGEX = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const MATH_DOUBLE_DOLLAR_REGEX = /^\s*\$\$\s*$/;
const MATH_LATEX_ENV_START_REGEX = /^\s*\\begin\{([a-zA-Z*0-9]+)\}/;
const LIST_ITEM_REGEX = /^(\s*)([*+-]|\d+[.)])\s+(.*)$/;
const CHECKBOX_REGEX = /^\[([ xX])\]\s+(.*)$/;

function capitalizeVariant(variant: MarkdownAlertVariant): string {
    switch (variant) {
        case "NOTE":
            return "Note";
        case "TIP":
            return "Tip";
        case "IMPORTANT":
            return "Important";
        case "WARNING":
            return "Warning";
        case "CAUTION":
            return "Caution";
    }
}

/** Determines if the next line is a valid table delimiter row. */
function isTableDelimiterRow(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed.includes("-")) return false;
    const stripped = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    const parts = stripped.split("|").map((p) => p.trim());
    if (parts.length === 0) return false;
    return parts.every((part) => /^:?-+:?$/.test(part));
}

/** Parses delimiter row into alignments array. */
function parseAlignments(delimiterLine: string): MarkdownTableAlignment[] {
    const stripped = delimiterLine.trim().replace(/^\|/, "").replace(/\|$/, "");
    return stripped.split("|").map((part) => {
        const trimmed = part.trim();
        const leftColon = trimmed.startsWith(":");
        const rightColon = trimmed.endsWith(":");
        if (leftColon && rightColon) return "center";
        if (leftColon) return "left";
        if (rightColon) return "right";
        return "none";
    });
}

/** Parses a single table row into cells given the expected alignments and column count. */
function parseTableRow(
    line: string,
    alignments: readonly MarkdownTableAlignment[],
    expectedColumns: number,
): MarkdownTableRowNode {
    const stripped = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    const rawTokens = stripped.split("|").map((t) => t.trim());

    const cells: MarkdownTableCellNode[] = [];
    for (let c = 0; c < expectedColumns; c++) {
        const text = rawTokens[c] ?? "";
        const alignment = alignments[c] ?? "none";
        const inlineChildren = text.length > 0 ? parseMarkdownInline(text) : [];
        cells.push({
            type: "table_cell",
            alignment,
            children: inlineChildren,
        });
    }

    return {
        type: "table_row",
        cells,
        children: cells,
    };
}

/** Parses GFM raw text into a hierarchical list of Markdown block nodes. */
export function parseMarkdownBlocks(text: string): MarkdownBlockNode[] {
    const lines = text.split(/\r?\n/);
    const rootBlocks: MarkdownBlockNode[] = [];
    const sectionStack: { section: MarkdownSectionNode; depth: number }[] = [];

    function addBlock(block: MarkdownBlockNode): void {
        if (sectionStack.length > 0) {
            const currentSection = sectionStack[sectionStack.length - 1].section;
            (currentSection.children as MarkdownBlockNode[]).push(block);
        } else {
            rootBlocks.push(block);
        }
    }

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // 1. Blank line: skip
        if (line.trim().length === 0) {
            i++;
            continue;
        }

        // 2. Display Math Block: $$
        if (MATH_DOUBLE_DOLLAR_REGEX.test(line)) {
            const rawLines = [line];
            const formulaLines: string[] = [];
            i++;
            while (i < lines.length && !MATH_DOUBLE_DOLLAR_REGEX.test(lines[i])) {
                rawLines.push(lines[i]);
                formulaLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) {
                rawLines.push(lines[i]);
                i++;
            }
            const mathNode: MarkdownMathDisplayBlockNode = {
                type: "math_display",
                delimiter: "$$",
                formula: formulaLines.join("\n"),
                raw: rawLines.join("\n"),
            };
            addBlock(mathNode);
            continue;
        }

        // 3. Display Math Block: \begin{...}
        const latexEnvMatch = line.match(MATH_LATEX_ENV_START_REGEX);
        if (latexEnvMatch) {
            const envName = latexEnvMatch[1];
            const endRegex = new RegExp(`^\\s*\\\\end\\{${envName}\\}`);
            const rawLines = [line];
            const formulaLines: string[] = [];
            i++;
            while (i < lines.length && !endRegex.test(lines[i])) {
                rawLines.push(lines[i]);
                formulaLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) {
                rawLines.push(lines[i]);
                i++;
            }
            const mathNode: MarkdownMathDisplayBlockNode = {
                type: "math_display",
                delimiter: envName,
                formula: formulaLines.join("\n"),
                raw: rawLines.join("\n"),
            };
            addBlock(mathNode);
            continue;
        }

        // 4. ATX Heading: # to ######
        const headingMatch = line.match(HEADING_REGEX);
        if (headingMatch) {
            const depth = headingMatch[1].length;
            const headingText = headingMatch[2].trim();
            const slug = slugifyHeading(headingText);

            const headingNode: MarkdownHeadingNode = {
                type: "heading",
                depth,
                slug,
                raw: line,
                children: parseMarkdownInline(headingText),
            };

            const sectionNode: MarkdownSectionNode = {
                type: "section",
                depth,
                heading: headingNode,
                children: [],
            };

            // Pop section stack until top depth is strictly less than this depth
            while (sectionStack.length > 0 && sectionStack[sectionStack.length - 1].depth >= depth) {
                sectionStack.pop();
            }

            if (sectionStack.length === 0) {
                rootBlocks.push(sectionNode);
            } else {
                const parentSection = sectionStack[sectionStack.length - 1].section;
                (parentSection.children as MarkdownBlockNode[]).push(sectionNode);
            }

            sectionStack.push({ section: sectionNode, depth });
            i++;
            continue;
        }

        // 5. Fenced Code Block: ``` or ~~~
        const fenceMatch = line.match(FENCE_START_REGEX);
        if (fenceMatch) {
            const fenceStr = fenceMatch[1];
            const fenceChar = fenceStr[0] as "`" | "~";
            const fenceLength = fenceStr.length;
            const infoString = fenceMatch[2].trim();
            const spaceIdx = infoString.indexOf(" ");
            const lang = spaceIdx >= 0 ? infoString.slice(0, spaceIdx) : infoString;
            const meta = spaceIdx >= 0 ? infoString.slice(spaceIdx + 1) : undefined;

            const closeFenceRegex = new RegExp(`^${fenceChar}{${fenceLength},}\\s*$`);
            const codeLines: string[] = [];
            const rawLines: string[] = [line];
            i++;

            while (i < lines.length && !closeFenceRegex.test(lines[i])) {
                codeLines.push(lines[i]);
                rawLines.push(lines[i]);
                i++;
            }
            if (i < lines.length) {
                rawLines.push(lines[i]);
                i++;
            }

            const codeBlockNode: MarkdownCodeBlockNode = {
                type: "code_block",
                lang,
                meta,
                code: codeLines.join("\n"),
                fenceChar,
                fenceLength,
                raw: rawLines.join("\n"),
            };
            addBlock(codeBlockNode);
            continue;
        }

        // 6. Thematic Break: ---, ***, ___
        // (Must not be followed immediately by a table delimiter line)
        if (THEMATIC_BREAK_REGEX.test(line) && !(i + 1 < lines.length && isTableDelimiterRow(lines[i + 1]))) {
            const ruleNode: MarkdownThematicBreakNode = {
                type: "thematic_break",
            };
            addBlock(ruleNode);
            i++;
            continue;
        }

        // 7. Pipe Table: Header row followed by delimiter row
        if (line.includes("|") && i + 1 < lines.length && isTableDelimiterRow(lines[i + 1])) {
            const headerLine = line;
            const delimiterLine = lines[i + 1];
            const alignments = parseAlignments(delimiterLine);
            const columnCount = alignments.length;

            const headerRow = parseTableRow(headerLine, alignments, columnCount);
            const bodyRows: MarkdownTableRowNode[] = [];
            i += 2;

            while (i < lines.length && lines[i].trim().length > 0 && lines[i].includes("|")) {
                const bodyRow = parseTableRow(lines[i], alignments, columnCount);
                bodyRows.push(bodyRow);
                i++;
            }

            const tableNode: MarkdownTableNode = {
                type: "table",
                header: headerRow,
                rows: bodyRows,
                alignments,
                children: [headerRow, ...bodyRows],
            };
            addBlock(tableNode);
            continue;
        }

        // 8. GitHub Alert Callout or Standard Blockquote: lines starting with >
        if (/^\s*>/.test(line)) {
            const alertMatch = line.match(ALERT_REGEX);
            if (alertMatch) {
                const rawVariant = alertMatch[1].toUpperCase() as MarkdownAlertVariant;
                const customTitle = alertMatch[2]?.trim();
                const title = customTitle && customTitle.length > 0 ? customTitle : capitalizeVariant(rawVariant);

                const bodyLines: string[] = [];
                i++;
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    bodyLines.push(lines[i].replace(/^\s*>\s?/, ""));
                    i++;
                }

                const childBlocks = parseMarkdownBlocks(bodyLines.join("\n"));
                const alertNode: MarkdownAlertNode = {
                    type: "alert",
                    variant: rawVariant,
                    title,
                    children: childBlocks,
                };
                addBlock(alertNode);
                continue;
            } else {
                // Standard blockquote
                const quoteLines: string[] = [line.replace(/^\s*>\s?/, "")];
                i++;
                while (i < lines.length && /^\s*>/.test(lines[i])) {
                    quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
                    i++;
                }
                const childBlocks = parseMarkdownBlocks(quoteLines.join("\n"));
                const blockquoteNode: MarkdownBlockquoteNode = {
                    type: "blockquote",
                    children: childBlocks,
                };
                addBlock(blockquoteNode);
                continue;
            }
        }

        // 9. Lists: Unordered or Ordered
        const listMatch = line.match(LIST_ITEM_REGEX);
        if (listMatch) {
            const marker = listMatch[2];
            const isOrdered = /^\d+[.)]$/.test(marker);
            const startNum = isOrdered ? parseInt(marker, 10) : undefined;
            const items: MarkdownListItemNode[] = [];

            while (i < lines.length) {
                const currentLine = lines[i];
                const currentMatch = currentLine.match(LIST_ITEM_REGEX);
                if (!currentMatch) break;

                const currentMarker = currentMatch[2];
                const currentIsOrdered = /^\d+[.)]$/.test(currentMarker);
                if (currentIsOrdered !== isOrdered) break;

                let itemText = currentMatch[3].trim();
                let checked: boolean | null = null;

                const checkboxMatch = itemText.match(CHECKBOX_REGEX);
                if (checkboxMatch) {
                    checked = checkboxMatch[1].toLowerCase() === "x";
                    itemText = checkboxMatch[2].trim();
                }

                const itemParagraph: MarkdownParagraphNode = {
                    type: "paragraph",
                    children: parseMarkdownInline(itemText),
                };

                items.push({
                    type: "list_item",
                    checked,
                    children: [itemParagraph],
                });

                i++;
            }

            const listNode: MarkdownListNode = {
                type: "list",
                ordered: isOrdered,
                start: startNum,
                items,
                children: items,
            };
            addBlock(listNode);
            continue;
        }

        // 10. Paragraph: Consecutive prose lines until blank line or block initiator
        const paragraphLines: string[] = [line];
        i++;
        while (i < lines.length) {
            const nextLine = lines[i];
            if (nextLine.trim().length === 0) break;
            if (MATH_DOUBLE_DOLLAR_REGEX.test(nextLine)) break;
            if (MATH_LATEX_ENV_START_REGEX.test(nextLine)) break;
            if (HEADING_REGEX.test(nextLine)) break;
            if (FENCE_START_REGEX.test(nextLine)) break;
            if (THEMATIC_BREAK_REGEX.test(nextLine)) break;
            if (/^\s*>/.test(nextLine)) break;
            if (LIST_ITEM_REGEX.test(nextLine)) break;
            if (nextLine.includes("|") && i + 1 < lines.length && isTableDelimiterRow(lines[i + 1])) break;

            paragraphLines.push(nextLine);
            i++;
        }

        const fullParagraphText = paragraphLines.join("\n");
        const paragraphNode: MarkdownParagraphNode = {
            type: "paragraph",
            children: parseMarkdownInline(fullParagraphText),
        };
        addBlock(paragraphNode);
    }

    return rootBlocks;
}
