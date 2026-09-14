/**
 * Strongly-typed GitHub Flavored Markdown (GFM) AST Node Hierarchy.
 *
 * Adheres strictly to AstNode base contracts in src/contracts/features/parsers/
 * and Phase 3 Stage 3 specifications.
 */

import type { AstLeafNode, AstNode, AstParentNode, AstRootNode } from "@internal/contracts/features/parsers";

export type MarkdownAlertVariant = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

export type MarkdownTableAlignment = "left" | "center" | "right" | "none";

// ============================================================================
// Inline Phrasing Nodes
// ============================================================================

export interface MarkdownTextNode extends AstLeafNode {
    readonly type: "text";
    readonly value: string;
}

export interface MarkdownEmphasisNode extends AstParentNode {
    readonly type: "emphasis";
    readonly kind: "bold" | "italic" | "strikethrough";
    readonly children: readonly MarkdownInlineNode[];
}

export interface MarkdownCodeSpanNode extends AstLeafNode {
    readonly type: "inline_code";
    readonly value: string;
    readonly code: string;
}

export interface MarkdownLinkNode extends AstParentNode {
    readonly type: "link";
    readonly url: string;
    readonly title?: string;
    readonly children: readonly MarkdownInlineNode[];
}

export interface MarkdownImageNode extends AstNode {
    readonly type: "image";
    readonly url: string;
    readonly alt: string;
    readonly title?: string;
}

export interface MarkdownMathInlineNode extends AstNode {
    readonly type: "inline_math";
    readonly formula: string;
    readonly raw: string;
}

export interface MarkdownLineBreakNode extends AstNode {
    readonly type: "line_break";
}

export type MarkdownInlineNode =
    | MarkdownTextNode
    | MarkdownEmphasisNode
    | MarkdownCodeSpanNode
    | MarkdownLinkNode
    | MarkdownImageNode
    | MarkdownMathInlineNode
    | MarkdownLineBreakNode;

// ============================================================================
// Block Nodes
// ============================================================================

export interface MarkdownHeadingNode extends AstParentNode {
    readonly type: "heading";
    readonly depth: number;
    readonly slug: string;
    readonly raw: string;
    readonly children: readonly MarkdownInlineNode[];
}

export interface MarkdownSectionNode extends AstParentNode {
    readonly type: "section";
    readonly depth: number;
    readonly heading: MarkdownHeadingNode;
    readonly children: readonly MarkdownBlockNode[];
}

export interface MarkdownParagraphNode extends AstParentNode {
    readonly type: "paragraph";
    readonly children: readonly MarkdownInlineNode[];
}

export interface MarkdownCodeBlockNode extends AstNode {
    readonly type: "code_block";
    readonly lang: string;
    readonly meta?: string;
    readonly code: string;
    readonly fenceChar: "`" | "~";
    readonly fenceLength: number;
    readonly raw: string;
}

export interface MarkdownBlockquoteNode extends AstParentNode {
    readonly type: "blockquote";
    readonly children: readonly MarkdownBlockNode[];
}

export interface MarkdownAlertNode extends AstParentNode {
    readonly type: "alert";
    readonly variant: MarkdownAlertVariant;
    readonly title: string;
    readonly children: readonly MarkdownBlockNode[];
}

export interface MarkdownTableCellNode extends AstParentNode {
    readonly type: "table_cell";
    readonly alignment: MarkdownTableAlignment;
    readonly children: readonly MarkdownInlineNode[];
}

export interface MarkdownTableRowNode extends AstParentNode {
    readonly type: "table_row";
    readonly cells: readonly MarkdownTableCellNode[];
    readonly children: readonly MarkdownTableCellNode[];
}

export interface MarkdownTableNode extends AstParentNode {
    readonly type: "table";
    readonly header: MarkdownTableRowNode;
    readonly rows: readonly MarkdownTableRowNode[];
    readonly alignments: readonly MarkdownTableAlignment[];
    readonly children: readonly MarkdownTableRowNode[];
}

export interface MarkdownListItemNode extends AstParentNode {
    readonly type: "list_item";
    readonly checked: boolean | null;
    readonly children: readonly MarkdownBlockNode[];
}

export interface MarkdownListNode extends AstParentNode {
    readonly type: "list";
    readonly ordered: boolean;
    readonly start?: number;
    readonly items: readonly MarkdownListItemNode[];
    readonly children: readonly MarkdownListItemNode[];
}

export interface MarkdownThematicBreakNode extends AstNode {
    readonly type: "thematic_break";
}

export interface MarkdownMathDisplayBlockNode extends AstNode {
    readonly type: "math_display";
    readonly formula: string;
    readonly raw: string;
    readonly delimiter: string;
}

export type MarkdownBlockNode =
    | MarkdownHeadingNode
    | MarkdownSectionNode
    | MarkdownParagraphNode
    | MarkdownCodeBlockNode
    | MarkdownBlockquoteNode
    | MarkdownAlertNode
    | MarkdownTableNode
    | MarkdownTableRowNode
    | MarkdownTableCellNode
    | MarkdownListNode
    | MarkdownListItemNode
    | MarkdownThematicBreakNode
    | MarkdownMathDisplayBlockNode;

// ============================================================================
// Root Document Node
// ============================================================================

export interface MarkdownDocumentNode extends AstRootNode {
    readonly type: "document";
    readonly format: "markdown";
    readonly title?: string;
    readonly children: readonly MarkdownBlockNode[];
}
