/**
 * Headless CommonMark & GitHub Flavored Markdown (GFM) Document Parser.
 *
 * Implements the top-level document parser contract converting raw Markdown
 * text into a root MarkdownDocumentNode conforming to AstRootNode.
 */

import type { MarkdownDocumentNode } from "./types.ts";
import { parseMarkdownBlocks } from "./blockParser.ts";

/** Parses raw Markdown text into a root MarkdownDocumentNode. */
export function parseMarkdownDocument(rawText: string): MarkdownDocumentNode {
    const blocks = parseMarkdownBlocks(rawText);

    // Derive document title from the first H1 section, if present
    let title: string | undefined;
    for (const block of blocks) {
        if (block.type === "section" && block.depth === 1) {
            title = block.heading.raw.replace(/^#+\s*/, "").trim();
            break;
        }
    }

    return {
        type: "document",
        format: "markdown",
        title,
        children: blocks,
    };
}
