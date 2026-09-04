/**
 * Markdown AST to Org-Mode Plaintext Serializer
 */

import {
    MarkdownBlockNode,
    MarkdownDocument,
    MarkdownInlineNode,
    MarkdownList,
    MarkdownTable,
} from "../../markdown/types/ast.ts";

export interface OrgExportOptions {
    parentDepth?: number;
    unwrapOrgBlocks?: boolean;
}

export function serializeMarkdownInlineToOrg(nodes: MarkdownInlineNode[]): string {
    if (!nodes || nodes.length === 0) return "";

    return nodes
        .map((node) => {
            switch (node.type) {
                case "text":
                    return node.value;
                case "bold":
                    return `*${serializeMarkdownInlineToOrg(node.children)}*`;
                case "italic":
                    return `/${serializeMarkdownInlineToOrg(node.children)}/`;
                case "bold_italic":
                    return `*/${serializeMarkdownInlineToOrg(node.children)}/*`;
                case "code_inline":
                    return `~${node.value}~`;
                case "strike":
                    return `+${serializeMarkdownInlineToOrg(node.children)}+`;
                case "link": {
                    const text = node.text ? serializeMarkdownInlineToOrg(node.children || []) : "";
                    return text && text !== node.href ? `[[${node.href}][${text}]]` : `[[${node.href}]]`;
                }
                case "math_inline":
                    return node.display ? `\\[${node.math}\\]` : `$${node.math}$`;
                case "line_break":
                    return "\n";
                default:
                    return "";
            }
        })
        .join("");
}

export function exportMarkdownToOrg(
    doc: MarkdownDocument,
    options: OrgExportOptions = {},
): string {
    const parentDepth = options.parentDepth ?? 0;
    const unwrapOrgBlocks = options.unwrapOrgBlocks ?? true;

    const output: string[] = [];
    let activeHeadingDepth = parentDepth > 0 ? parentDepth : 1;

    const serializeList = (list: MarkdownList, indentLevel = 0): string => {
        const indent = "  ".repeat(indentLevel);
        const listOutput: string[] = [];

        list.items.forEach((item, idx) => {
            const prefix = list.ordered
                ? `${(list.start ?? 1) + idx}. `
                : item.checked !== null && item.checked !== undefined
                ? item.checked ? "- [X] " : "- [ ] "
                : "- ";

            const itemTextParts: string[] = [];
            const nestedBlocks: MarkdownBlockNode[] = [];

            item.children.forEach((child) => {
                if (
                    "type" in child &&
                    (child.type === "list" || child.type === "code_block" || child.type === "blockquote")
                ) {
                    nestedBlocks.push(child as MarkdownBlockNode);
                } else {
                    itemTextParts.push(serializeMarkdownInlineToOrg([child as MarkdownInlineNode]));
                }
            });

            listOutput.push(`${indent}${prefix}${itemTextParts.join("")}`);

            nestedBlocks.forEach((b) => {
                if (b.type === "list") {
                    listOutput.push(serializeList(b, indentLevel + 1));
                }
            });
        });

        return listOutput.join("\n");
    };

    const serializeTable = (table: MarkdownTable): string => {
        const tableLines: string[] = [];

        // Header
        const headerCells = table.headers.map((h) => serializeMarkdownInlineToOrg(h.children));
        tableLines.push(`| ${headerCells.join(" | ")} |`);

        // Divider
        const dividerCells = table.headers.map(() => "---");
        tableLines.push(`|-${dividerCells.join("-+-")}-|`);

        // Rows
        table.rows.forEach((row) => {
            const rowCells = row.map((c) => serializeMarkdownInlineToOrg(c.children));
            tableLines.push(`| ${rowCells.join(" | ")} |`);
        });

        return tableLines.join("\n");
    };

    for (const block of doc.children) {
        switch (block.type) {
            case "heading": {
                const targetLevel = parentDepth + block.level;
                activeHeadingDepth = targetLevel;
                const title = serializeMarkdownInlineToOrg(block.children);
                output.push(`${"*".repeat(targetLevel)} ${title}`);
                break;
            }

            case "paragraph": {
                output.push(serializeMarkdownInlineToOrg(block.children));
                break;
            }

            case "code_block": {
                if (block.isOrg && unwrapOrgBlocks) {
                    // Unwrap Org mode block and re-level internal heading stars
                    const lines = block.content.split("\n");
                    const adjustedLines: string[] = [];

                    for (const rawLine of lines) {
                        const orgHeadingMatch = rawLine.match(/^(\*+)(\s+.*)$/);
                        if (orgHeadingMatch) {
                            const originalStars = orgHeadingMatch[1].length;
                            const restOfLine = orgHeadingMatch[2];
                            // Re-level: offset by active section depth
                            const newLevel = activeHeadingDepth + originalStars;
                            adjustedLines.push(`${"*".repeat(newLevel)}${restOfLine}`);
                        } else {
                            adjustedLines.push(rawLine);
                        }
                    }

                    output.push(adjustedLines.join("\n"));
                } else {
                    // Non-org code block
                    const langTag = block.lang ? ` ${block.lang}` : "";
                    output.push(`#+BEGIN_SRC${langTag}\n${block.content}\n#+END_SRC`);
                }
                break;
            }

            case "list": {
                output.push(serializeList(block));
                break;
            }

            case "table": {
                output.push(serializeTable(block));
                break;
            }

            case "blockquote": {
                const quoteDoc: MarkdownDocument = { type: "document", children: block.children };
                const quoteText = exportMarkdownToOrg(quoteDoc, { parentDepth: 0, unwrapOrgBlocks });
                output.push(`#+BEGIN_QUOTE\n${quoteText}\n#+END_QUOTE`);
                break;
            }

            case "thematic_break": {
                output.push("-----");
                break;
            }

            case "math_block": {
                output.push(`\\begin{equation}\n${block.content}\n\\end{equation}`);
                break;
            }
        }
    }

    return output.join("\n\n");
}
