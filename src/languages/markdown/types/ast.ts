/**
 * CommonMark & GFM Markdown Abstract Syntax Tree (AST) Types
 */

export type MarkdownNodeType =
    | "document"
    | "heading"
    | "paragraph"
    | "code_block"
    | "blockquote"
    | "list"
    | "list_item"
    | "table"
    | "thematic_break"
    | "math_block"
    | "text"
    | "bold"
    | "italic"
    | "bold_italic"
    | "code_inline"
    | "strike"
    | "link"
    | "math_inline"
    | "line_break";

export interface BaseMarkdownNode {
    type: MarkdownNodeType;
}

export type TableAlignment = "left" | "center" | "right" | null;

export interface MarkdownTableCell {
    children: MarkdownInlineNode[];
    raw: string;
}

export interface MarkdownTableRow {
    cells: MarkdownTableCell[];
}

export interface MarkdownDocument extends BaseMarkdownNode {
    type: "document";
    children: MarkdownBlockNode[];
}

export interface MarkdownHeading extends BaseMarkdownNode {
    type: "heading";
    level: number; // 1 to 6
    children: MarkdownInlineNode[];
    raw: string;
}

export interface MarkdownParagraph extends BaseMarkdownNode {
    type: "paragraph";
    children: MarkdownInlineNode[];
    raw: string;
}

export interface MarkdownCodeBlock extends BaseMarkdownNode {
    type: "code_block";
    lang?: string;
    info?: string;
    content: string;
    isOrg?: boolean;
}

export interface MarkdownBlockquote extends BaseMarkdownNode {
    type: "blockquote";
    children: MarkdownBlockNode[];
}

export interface MarkdownList extends BaseMarkdownNode {
    type: "list";
    ordered: boolean;
    start?: number;
    items: MarkdownListItem[];
}

export interface MarkdownListItem extends BaseMarkdownNode {
    type: "list_item";
    checked?: boolean | null; // null for non-task, true for [x], false for [ ]
    children: (MarkdownBlockNode | MarkdownInlineNode)[];
}

export interface MarkdownTable extends BaseMarkdownNode {
    type: "table";
    headers: MarkdownTableCell[];
    alignments: TableAlignment[];
    rows: MarkdownTableCell[][];
}

export interface MarkdownThematicBreak extends BaseMarkdownNode {
    type: "thematic_break";
}

export interface MarkdownMathBlock extends BaseMarkdownNode {
    type: "math_block";
    content: string;
    env?: string;
}

export type MarkdownBlockNode =
    | MarkdownHeading
    | MarkdownParagraph
    | MarkdownCodeBlock
    | MarkdownBlockquote
    | MarkdownList
    | MarkdownTable
    | MarkdownThematicBreak
    | MarkdownMathBlock;

export interface MarkdownText extends BaseMarkdownNode {
    type: "text";
    value: string;
}

export interface MarkdownBold extends BaseMarkdownNode {
    type: "bold";
    children: MarkdownInlineNode[];
}

export interface MarkdownItalic extends BaseMarkdownNode {
    type: "italic";
    children: MarkdownInlineNode[];
}

export interface MarkdownBoldItalic extends BaseMarkdownNode {
    type: "bold_italic";
    children: MarkdownInlineNode[];
}

export interface MarkdownCodeInline extends BaseMarkdownNode {
    type: "code_inline";
    value: string;
}

export interface MarkdownStrike extends BaseMarkdownNode {
    type: "strike";
    children: MarkdownInlineNode[];
}

export interface MarkdownLink extends BaseMarkdownNode {
    type: "link";
    text: string;
    href: string;
    title?: string;
    children?: MarkdownInlineNode[];
}

export interface MarkdownMathInline extends BaseMarkdownNode {
    type: "math_inline";
    math: string;
    display?: boolean;
}

export interface MarkdownLineBreak extends BaseMarkdownNode {
    type: "line_break";
}

export type MarkdownInlineNode =
    | MarkdownText
    | MarkdownBold
    | MarkdownItalic
    | MarkdownBoldItalic
    | MarkdownCodeInline
    | MarkdownStrike
    | MarkdownLink
    | MarkdownMathInline
    | MarkdownLineBreak;

export type MarkdownNode = MarkdownBlockNode | MarkdownInlineNode | MarkdownListItem;
