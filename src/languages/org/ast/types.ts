/**
 * Canonical Strongly-Typed Abstract Syntax Tree (AST) definitions for Org-mode documents.
 * Adheres strictly to the Emacs Org-mode org-element.el specification.
 *
 * Differentiates cleanly between:
 * - Structural Elements (Containers & Blocks): OrgElement
 * - Inline Objects (Phrasing tokens inside paragraphs, table cells, headlines): OrgObject
 *
 * 100% pure TypeScript with zero DOM or external runtime dependencies.
 */

// =============================================================================
// Discriminated Type Unions
// =============================================================================

/** Structural element types (greater elements & leaf elements) */
export type OrgElementType =
    | "document"
    | "headline"
    | "section"
    | "planning"
    | "property_drawer"
    | "node_property"
    | "drawer"
    | "dynamic_block"
    | "block"
    | "keyword"
    | "comment"
    | "fixed_width"
    | "horizontal_rule"
    | "footnote_definition"
    | "latex_environment"
    | "babel_call"
    | "clock"
    | "list"
    | "list_item"
    | "table"
    | "table_row"
    | "paragraph";

/** Inline phrasing object types */
export type OrgObjectType =
    | "text"
    | "bold"
    | "italic"
    | "underline"
    | "strike"
    | "code"
    | "verbatim"
    | "link"
    | "macro"
    | "subscript"
    | "superscript"
    | "entity"
    | "latex_fragment"
    | "footnote_reference"
    | "citation"
    | "citation_reference"
    | "inline_src_block"
    | "inline_babel_call"
    | "statistics_cookie"
    | "target"
    | "radio_target"
    | "line_break"
    | "timestamp"
    | "table_cell";

/** Complete discriminated union of all syntax node types */
export type OrgNodeType = OrgElementType | OrgObjectType;

// =============================================================================
// Affiliated Keywords Contract
// =============================================================================

export interface OrgKeywordElement {
    type: "keyword";
    /** Normalized lowercase keyword, e.g. "title", "caption", "name", "author", "attr_html" */
    key: string;
    /** Optional bracketed argument, e.g. from #+ATTR_HTML[width="200"]: */
    optionalArg?: string;
    /** Raw value following the colon separator */
    value: string;
    /** Pristine original line content */
    raw: string;
}

/**
 * Interface implemented by structural elements that can receive immediately preceding affiliated keywords.
 */
export interface WithAffiliatedKeywords {
    /** Affiliated keywords bound directly to this element */
    affiliatedKeywords?: OrgKeywordElement[];
    /** Shortcut name extracted from #+NAME: */
    name?: string;
    /** Shortcut caption extracted from #+CAPTION: */
    caption?: OrgObject[];
    /** Attributes dictionary extracted from #+ATTR_... keywords */
    attributes?: Record<string, string>;
}

// =============================================================================
// Inline Phrasing Objects (OrgObject)
// =============================================================================

export interface OrgTextObject {
    type: "text";
    value: string;
}

export interface OrgBoldObject {
    type: "bold";
    children: OrgObject[];
}

export interface OrgItalicObject {
    type: "italic";
    children: OrgObject[];
}

export interface OrgUnderlineObject {
    type: "underline";
    children: OrgObject[];
}

export interface OrgStrikeObject {
    type: "strike";
    children: OrgObject[];
}

export interface OrgCodeObject {
    type: "code";
    value: string;
}

export interface OrgVerbatimObject {
    type: "verbatim";
    value: string;
}

export interface OrgLinkObject {
    type: "link";
    url: string;
    description?: OrgObject[];
}

export interface OrgMacroObject {
    type: "macro";
    name: string;
    args: string[];
    raw: string;
}

export interface OrgSubscriptObject {
    type: "subscript";
    value: OrgObject[] | string;
}

export interface OrgSuperscriptObject {
    type: "superscript";
    value: OrgObject[] | string;
}

export interface OrgEntityObject {
    type: "entity";
    name: string;
    latex: string;
    unicode?: string;
}

export interface OrgLatexFragmentObject {
    type: "latex_fragment";
    value: string;
}

export interface OrgFootnoteReferenceObject {
    type: "footnote_reference";
    label: string;
    definition?: OrgObject[];
}

export interface OrgCitationObject {
    type: "citation";
    value: string;
}

export interface OrgCitationReferenceObject {
    type: "citation_reference";
    key: string;
}

export interface OrgInlineSrcBlockObject {
    type: "inline_src_block";
    language: string;
    body: string;
}

export interface OrgInlineBabelCallObject {
    type: "inline_babel_call";
    value: string;
}

export interface OrgStatisticsCookieObject {
    type: "statistics_cookie";
    value: string;
    percent?: number;
    current?: number;
    total?: number;
}

export interface OrgTargetObject {
    type: "target";
    value: string;
}

export interface OrgRadioTargetObject {
    type: "radio_target";
    children: OrgObject[];
}

export interface OrgLineBreakObject {
    type: "line_break";
}

export interface OrgTimestampObject {
    type: "timestamp";
    raw: string;
    isActive: boolean;
}

export interface OrgTableCellObject {
    type: "table_cell";
    children: OrgObject[];
}

export type OrgObject =
    | OrgTextObject
    | OrgBoldObject
    | OrgItalicObject
    | OrgUnderlineObject
    | OrgStrikeObject
    | OrgCodeObject
    | OrgVerbatimObject
    | OrgLinkObject
    | OrgMacroObject
    | OrgSubscriptObject
    | OrgSuperscriptObject
    | OrgEntityObject
    | OrgLatexFragmentObject
    | OrgFootnoteReferenceObject
    | OrgCitationObject
    | OrgCitationReferenceObject
    | OrgInlineSrcBlockObject
    | OrgInlineBabelCallObject
    | OrgStatisticsCookieObject
    | OrgTargetObject
    | OrgRadioTargetObject
    | OrgLineBreakObject
    | OrgTimestampObject
    | OrgTableCellObject;

// =============================================================================
// Structural Elements (OrgElement)
// =============================================================================

export interface OrgDocumentElement {
    type: "document";
    title?: string;
    properties?: Record<string, string>;
    children: OrgElement[];
}

export interface OrgPlanningElement {
    type: "planning";
    closed?: string;
    deadline?: string;
    scheduled?: string;
    raw: string;
}

export interface OrgHeadlineElement {
    type: "headline";
    level: number;
    todoKeyword?: string;
    priority?: string;
    title: OrgObject[];
    tags: string[];
    planning?: OrgPlanningElement;
    properties?: Record<string, string>;
    children: OrgElement[];
    isFolded?: boolean;
}

export interface OrgSectionElement {
    type: "section";
    children: OrgElement[];
}

export interface OrgNodePropertyElement {
    type: "node_property";
    key: string;
    value: string;
}

export interface OrgPropertyDrawerElement {
    type: "property_drawer";
    properties: Record<string, string>;
    children: OrgNodePropertyElement[];
}

export interface OrgDrawerElement {
    type: "drawer";
    name: string;
    lines: string[];
}

export interface OrgDynamicBlockElement {
    type: "dynamic_block";
    name: string;
    arguments?: string;
    value: string;
}

export interface OrgBlockElement extends WithAffiliatedKeywords {
    type: "block";
    /** Block type, e.g. "src", "example", "quote", "export", "verse", "center", "special" */
    blockType: string;
    language?: string;
    arguments?: string;
    value: string;
}

export interface OrgCommentElement {
    type: "comment";
    value: string;
}

export interface OrgFixedWidthElement extends WithAffiliatedKeywords {
    type: "fixed_width";
    value: string;
}

export interface OrgHorizontalRuleElement {
    type: "horizontal_rule";
}

export interface OrgFootnoteDefinitionElement {
    type: "footnote_definition";
    label: string;
    children: OrgElement[];
}

export interface OrgLatexEnvironmentElement extends WithAffiliatedKeywords {
    type: "latex_environment";
    value: string;
}

export interface OrgBabelCallElement {
    type: "babel_call";
    value: string;
}

export interface OrgClockElement {
    type: "clock";
    value: string;
}

export interface OrgListItemElement {
    type: "list_item";
    bullet: string;
    /** Optional definition tag for description lists: - <tag> :: <content> */
    tag?: OrgObject[];
    /** Checkbox state: [ ], [X], [-] */
    checked?: boolean | "indeterminate";
    /** Progress counter cookie: [2/5] or [40%] */
    counterCookie?: string;
    children: (OrgElement | OrgObject)[];
}

export interface OrgListElement extends WithAffiliatedKeywords {
    type: "list";
    ordered: boolean;
    children: OrgListItemElement[];
}

export interface OrgTableRowElement {
    type: "table_row";
    /** True for horizontal separator rule rows (|---+---|) */
    isRule: boolean;
    cells: OrgTableCellObject[];
}

export type OrgTableColumnAlignment = "left" | "center" | "right" | "default";

export interface OrgTableElement extends WithAffiliatedKeywords {
    type: "table";
    rows: OrgTableRowElement[];
    alignments?: OrgTableColumnAlignment[];
}

export interface OrgParagraphElement extends WithAffiliatedKeywords {
    type: "paragraph";
    children: OrgObject[];
}

export type OrgElement =
    | OrgDocumentElement
    | OrgHeadlineElement
    | OrgSectionElement
    | OrgPlanningElement
    | OrgPropertyDrawerElement
    | OrgNodePropertyElement
    | OrgDrawerElement
    | OrgDynamicBlockElement
    | OrgBlockElement
    | OrgKeywordElement
    | OrgCommentElement
    | OrgFixedWidthElement
    | OrgHorizontalRuleElement
    | OrgFootnoteDefinitionElement
    | OrgLatexEnvironmentElement
    | OrgBabelCallElement
    | OrgClockElement
    | OrgListElement
    | OrgListItemElement
    | OrgTableElement
    | OrgTableRowElement
    | OrgParagraphElement;

/** Union of any syntax node in the AST */
export type OrgNode = OrgElement | OrgObject;

/** Convenient type alias matching document root node */
export type OrgDocumentNode = OrgDocumentElement;
export type OrgMetadataCommentNode = OrgKeywordElement;
