/**
 * CommonMark & GFM Markdown Block Parser
 */

import { isOrgContent } from "../../org/parser/detector.ts";
import {
    MarkdownBlockNode,
    MarkdownCodeBlock,
    MarkdownDocument,
    MarkdownInlineNode,
    MarkdownListItem,
    MarkdownTableCell,
    TableAlignment,
} from "../types/ast.ts";
import { tokenizeMarkdownInline } from "./inline-lexer.ts";

export function parseMarkdown(rawText: string): MarkdownDocument {
    if (!rawText) {
        return { type: "document", children: [] };
    }

    const lines = rawText.replace(/\r\n/g, "\n").split("\n");
    const children: MarkdownBlockNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // 1. Skip empty lines
        if (!line.trim()) {
            i++;
            continue;
        }

        // 2. Fenced Code Block: ``` or ~~~
        const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
        if (fenceMatch) {
            const indent = fenceMatch[1];
            const delimiter = fenceMatch[2];
            const info = fenceMatch[3].trim();
            const lang = info.split(/\s+/)[0] || "";
            const contentLines: string[] = [];
            i++;

            while (i < lines.length) {
                const cur = lines[i];
                if (cur.trim().startsWith(delimiter)) {
                    i++;
                    break;
                }
                // Strip common indent if present
                contentLines.push(cur.startsWith(indent) ? cur.slice(indent.length) : cur);
                i++;
            }

            const content = contentLines.join("\n");
            const isExplicitOrg = /^(org|org-mode|orgmode|text\/org)$/i.test(lang);
            const isDetectedOrg = isExplicitOrg || isOrgContent(content);

            const codeBlock: MarkdownCodeBlock = {
                type: "code_block",
                lang,
                info,
                content,
                isOrg: isDetectedOrg,
            };
            children.push(codeBlock);
            continue;
        }

        // 3. Display Math Block: $$ ... $$
        if (line.trim() === "$$") {
            const mathLines: string[] = [];
            i++;
            while (i < lines.length && lines[i].trim() !== "$$") {
                mathLines.push(lines[i]);
                i++;
            }
            if (i < lines.length && lines[i].trim() === "$$") {
                i++;
            }
            children.push({
                type: "math_block",
                content: mathLines.join("\n"),
            });
            continue;
        }

        // 4. Heading: # through ######
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2].trim();
            children.push({
                type: "heading",
                level,
                children: tokenizeMarkdownInline(text),
                raw: text,
            });
            i++;
            continue;
        }

        // 5. Thematic Break / Horizontal Rule: ---, ***, ___
        if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
            children.push({ type: "thematic_break" });
            i++;
            continue;
        }

        // 6. Blockquote: >
        if (line.trim().startsWith(">")) {
            const quoteLines: string[] = [];
            while (
                i < lines.length &&
                (lines[i].trim().startsWith(">") ||
                    (lines[i].trim() && quoteLines.length > 0 &&
                        !lines[i].match(/^(#{1,6}\s|```|~~~|[-*+]\s|\d+\.\s)/)))
            ) {
                const qLine = lines[i].trim();
                if (qLine.startsWith(">")) {
                    quoteLines.push(qLine.replace(/^>\s?/, ""));
                } else {
                    quoteLines.push(lines[i]);
                }
                i++;
            }
            const innerDoc = parseMarkdown(quoteLines.join("\n"));
            children.push({
                type: "blockquote",
                children: innerDoc.children,
            });
            continue;
        }

        // 7. Tables: | col | col |
        if (
            line.trim().startsWith("|") ||
            (line.includes("|") && lines[i + 1]?.includes("|") && lines[i + 1]?.includes("-"))
        ) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
                tableLines.push(lines[i].trim());
                i++;
            }

            if (tableLines.length >= 2) {
                const parseRow = (rowLine: string): string[] => {
                    const trimmed = rowLine.replace(/^\|/, "").replace(/\|$/, "");
                    return trimmed.split("|").map((cell) => cell.trim());
                };

                const headerRow = parseRow(tableLines[0]);
                const delimiterRow = parseRow(tableLines[1]);

                // Check if delimiter row contains dashes
                const isTable = delimiterRow.every((cell) => /^:?-+:?$/.test(cell));

                if (isTable) {
                    const alignments: TableAlignment[] = delimiterRow.map((cell) => {
                        const left = cell.startsWith(":");
                        const right = cell.endsWith(":");
                        if (left && right) return "center";
                        if (right) return "right";
                        if (left) return "left";
                        return null;
                    });

                    const headers: MarkdownTableCell[] = headerRow.map((cell) => ({
                        children: tokenizeMarkdownInline(cell),
                        raw: cell,
                    }));

                    const rows: MarkdownTableCell[][] = [];
                    for (let r = 2; r < tableLines.length; r++) {
                        const rowCells = parseRow(tableLines[r]);
                        rows.push(
                            rowCells.map((cell) => ({
                                children: tokenizeMarkdownInline(cell),
                                raw: cell,
                            })),
                        );
                    }

                    children.push({
                        type: "table",
                        headers,
                        alignments,
                        rows,
                    });
                    continue;
                }
            }
        }

        // 8. Lists: Ordered (1. ) and Unordered (- , * , + )
        const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (listMatch) {
            const listIndent = listMatch[1].length;
            const isOrdered = /^\d+\./.test(listMatch[2]);
            const startNum = isOrdered ? parseInt(listMatch[2], 10) : undefined;
            const items: MarkdownListItem[] = [];

            while (i < lines.length) {
                const curLine = lines[i];
                if (!curLine.trim()) {
                    // Check if next line continues list
                    if (
                        i + 1 < lines.length &&
                        (lines[i + 1].startsWith(" ") || lines[i + 1].match(/^(\s*)([-*+]|\d+\.)\s+/))
                    ) {
                        i++;
                        continue;
                    }
                    break;
                }

                const itemMatch = curLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
                if (itemMatch && itemMatch[1].length === listIndent) {
                    const itemRaw = itemMatch[3];
                    let checked: boolean | null = null;
                    let textContent = itemRaw;

                    const taskMatch = itemRaw.match(/^\[([ xX])\]\s+(.*)$/);
                    if (taskMatch) {
                        checked = taskMatch[1].toLowerCase() === "x";
                        textContent = taskMatch[2];
                    }

                    const itemChildren: (MarkdownBlockNode | MarkdownInlineNode)[] = tokenizeMarkdownInline(
                        textContent,
                    );
                    items.push({
                        type: "list_item",
                        checked,
                        children: itemChildren,
                    });
                    i++;
                } else if (curLine.startsWith(" ".repeat(listIndent + 2)) || curLine.startsWith("\t")) {
                    // Continuation or nested block in list item
                    if (items.length > 0) {
                        const lastItem = items[items.length - 1];
                        const nestedLines: string[] = [curLine.trim()];
                        i++;
                        while (
                            i < lines.length &&
                            (lines[i].startsWith(" ".repeat(listIndent + 2)) || lines[i].startsWith("\t") ||
                                !lines[i].trim())
                        ) {
                            if (lines[i].trim()) nestedLines.push(lines[i].trim());
                            i++;
                        }
                        const nestedDoc = parseMarkdown(nestedLines.join("\n"));
                        lastItem.children.push(...nestedDoc.children);
                    } else {
                        i++;
                    }
                } else {
                    break;
                }
            }

            children.push({
                type: "list",
                ordered: isOrdered,
                start: startNum,
                items,
            });
            continue;
        }

        // 9. Paragraph: group continuous non-empty lines
        const paraLines: string[] = [];
        while (
            i < lines.length &&
            lines[i].trim() &&
            !lines[i].match(/^(#{1,6}\s|```|~~~|[-*+]\s|\d+\.\s|>\s?|\$\$)/) &&
            !lines[i].match(/^(\s*[-*_]\s*){3,}$/) &&
            !(lines[i].includes("|") && lines[i + 1]?.includes("-"))
        ) {
            paraLines.push(lines[i]);
            i++;
        }

        if (paraLines.length > 0) {
            const rawPara = paraLines.join(" ");
            children.push({
                type: "paragraph",
                children: tokenizeMarkdownInline(rawPara),
                raw: rawPara,
            });
        }
    }

    return {
        type: "document",
        children,
    };
}
