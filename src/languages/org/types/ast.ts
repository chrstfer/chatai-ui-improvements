/**
 * Standalone Org-Mode AST & Token Types
 * Zero browser or Gemini dependencies.
 */

export type OrgBlockType = "src" | "example" | "quote" | "verse" | "center" | "comment" | "results";

export type OrgCheckboxState = "none" | "unchecked" | "checked" | "partial";

export interface OrgMetadata {
    key: string;
    val: string;
}

export interface OrgDrawerEntry {
    type: "kv" | "raw";
    key?: string;
    val?: string;
    raw?: string;
}

export interface OrgDrawerNode {
    type: "drawer";
    name: string;
    entries: OrgDrawerEntry[];
}

export interface OrgTableRow {
    isDivider: boolean;
    cells: string[];
}

export interface OrgTableNode {
    type: "table";
    hasHeader: boolean;
    rows: OrgTableRow[];
}

export interface OrgListItemNode {
    type: "list_item";
    indent: number;
    isOrdered: boolean;
    bullet: string;
    checkbox: OrgCheckboxState;
    term?: string;
    text: string;
    children: OrgListItemNode[];
}

export interface OrgListNode {
    type: "list";
    isOrdered: boolean;
    indent: number;
    items: OrgListItemNode[];
}

export interface OrgSrcBlockNode {
    type: "src_block";
    blockType: OrgBlockType;
    lang?: string;
    name?: string;
    params?: string;
    content: string[];
    results?: {
        name?: string;
        content: string[];
    };
}

export interface OrgLatexBlockNode {
    type: "latex_block";
    environment?: string; // equation, align, cases, etc.
    content: string;
}

export interface OrgParagraphNode {
    type: "paragraph";
    text: string;
}

export interface OrgBlankLineNode {
    type: "blank_line";
}

export interface OrgHorizontalRuleNode {
    type: "horizontal_rule";
}

export type OrgContentNode =
    | OrgParagraphNode
    | OrgBlankLineNode
    | OrgHorizontalRuleNode
    | OrgSrcBlockNode
    | OrgLatexBlockNode
    | OrgDrawerNode
    | OrgTableNode
    | OrgListNode;

export interface OrgHeading {
    level: number;
    rawText: string;
    title: string;
    status?: string;
    priority?: string;
    tags: string[];
    statsCookie?: string;
}

export interface OrgSectionNode {
    type: "section";
    heading: OrgHeading;
    body: OrgContentNode[];
    children: OrgSectionNode[];
    rawSubtree?: string;
}

export interface OrgDocument {
    metadata: OrgMetadata[];
    preamble: OrgContentNode[];
    sections: OrgSectionNode[];
}

export type InlineTokenType =
    | "text"
    | "bold"
    | "italic"
    | "underline"
    | "strike"
    | "code"
    | "verbatim"
    | "latex_inline"
    | "link"
    | "timestamp"
    | "footnote"
    | "planning"
    | "priority"
    | "stats_cookie";

export interface InlineToken {
    type: InlineTokenType;
    value: string;
    target?: string; // For links or footnotes
    extra?: Record<string, string>;
}
