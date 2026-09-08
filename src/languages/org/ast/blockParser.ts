/**
 * Headless Org-mode Block Parser and AST Tree Builder.
 * Implements a streaming, single-pass line-by-line state machine with O(N) traversal.
 *
 * Adheres strictly to the Emacs Org-mode org-element.el specification:
 * - Disambiguates block delimiters (#+BEGIN_... / #+END_...) from keywords (#+KEY: VALUE).
 * - Scopes affiliated keywords (#+NAME:, #+CAPTION:, #+ATTR_...) to following blocks/tables.
 * - Captures document-level settings (#+TITLE:, #+AUTHOR:, etc.) into OrgDocumentElement.
 * - Builds headline hierarchy tree using level stack.
 * - Parses property drawers, generic drawers, fixed-width blocks, horizontal rules.
 * - Parses pipe tables with rule rows, alignments, column padding, and cell normalization.
 * - Parses plain lists, nested lists, checkboxes, cookies, and description items.
 * - Parses paragraphs with inline object recursion.
 *
 * 100% pure TypeScript with zero DOM or external runtime dependencies.
 */

import type {
    OrgBlockElement,
    OrgCommentElement,
    OrgDocumentElement,
    OrgDrawerElement,
    OrgDynamicBlockElement,
    OrgElement,
    OrgFixedWidthElement,
    OrgFootnoteDefinitionElement,
    OrgHeadlineElement,
    OrgHorizontalRuleElement,
    OrgKeywordElement,
    OrgLatexEnvironmentElement,
    OrgListElement,
    OrgListItemElement,
    OrgParagraphElement,
    OrgPlanningElement,
    OrgPropertyDrawerElement,
    OrgTableCellObject,
    OrgTableColumnAlignment,
    OrgTableElement,
    OrgTableRowElement,
    WithAffiliatedKeywords,
} from "./types.ts";
import { parseOrgInline } from "./inlineParser.ts";

// =============================================================================
// Regular Expression Grammar Definitions
// =============================================================================

/** Block opening delimiter: #+BEGIN_SRC, #+BEGIN_QUOTE, #+BEGIN: clocktable */
const BLOCK_START_REGEX = /^\s*#\+(?:begin_([a-zA-Z0-9_-]+)|begin:\s*([a-zA-Z0-9_-]+)?)(?:\s+(.*))?$/i;

/** Block closing delimiter: #+END_SRC, #+END: */
const BLOCK_END_REGEX = /^\s*#\+(?:end_([a-zA-Z0-9_-]+)|end:)\s*$/i;

/** In-buffer keyword / metadata comment: #+KEY[OPT]: VALUE */
const KEYWORD_REGEX = /^\s*#\+([a-zA-Z0-9_-]+)(?:\[(.*?)\])?:\s*(.*)$/;

/** Comment line: # ... (not #+) */
const COMMENT_REGEX = /^\s*#(?:\s+(.*)|$)/;

/** Headline line: * to ****** followed by space */
const HEADLINE_REGEX = /^(\*{1,6})\s+(.*)$/;

/** Planning metadata line directly following headline */
const PLANNING_REGEX = /^\s*(?:(CLOSED|DEADLINE|SCHEDULED):\s*(?:\[[^\]]+\]|<[^>]+>)\s*)+$/i;

/** Planning entry extractor */
const PLANNING_ITEM_REGEX = /(CLOSED|DEADLINE|SCHEDULED):\s*(\[[^\]]+\]|<[^>]+>)/gi;

/** Generic drawer opening: :DRAWER_NAME: */
const DRAWER_START_REGEX = /^\s*:([a-zA-Z0-9_-]+):\s*$/;

/** Drawer closing: :END: */
const DRAWER_END_REGEX = /^\s*:END:\s*$/i;

/** Property entry inside property drawer: :KEY: VALUE */
const NODE_PROPERTY_REGEX = /^\s*:([a-zA-Z0-9_-]+):\s*(.*)$/;

/** Horizontal rule: 5 or more hyphens */
const HORIZONTAL_RULE_REGEX = /^\s*-{5,}\s*$/;

/** Fixed-width line: colon followed by space or end of line */
const FIXED_WIDTH_REGEX = /^\s*:(?:\s(.*)|$)/;

/** LaTeX environment start: \begin{env} */
const LATEX_ENV_START_REGEX = /^\s*\\begin\{([a-zA-Z*0-9]+)\}/;

/** Footnote definition: [fn:label] content */
const FOOTNOTE_DEF_REGEX = /^\s*\[fn:([^\]]+)\]\s+(.*)$/;

/** Pipe table row */
const TABLE_ROW_REGEX = /^\s*\|(.*)$/;

/** Known TODO keywords */
const KNOWN_TODO_KEYWORDS = new Set([
    "TODO",
    "DONE",
    "NEXT",
    "WAIT",
    "WAITING",
    "HOLD",
    "CANCELLED",
    "CANCELED",
    "FIXME",
]);

// =============================================================================
// Affiliated Keywords Helper
// =============================================================================

function attachAffiliatedKeywords(
    element: WithAffiliatedKeywords,
    pendingKeywords: OrgKeywordElement[],
): void {
    if (pendingKeywords.length === 0) return;
    element.affiliatedKeywords = [...pendingKeywords];
    for (const kw of pendingKeywords) {
        const lowerKey = kw.key.toLowerCase();
        if (lowerKey === "name") {
            element.name = kw.value.trim();
        } else if (lowerKey === "caption") {
            element.caption = parseOrgInline(kw.value.trim());
        } else if (lowerKey.startsWith("attr_")) {
            if (!element.attributes) {
                element.attributes = {};
            }
            element.attributes[kw.key] = kw.value.trim();
        }
    }
    pendingKeywords.length = 0;
}

// =============================================================================
// Headline Parser Helpers
// =============================================================================

interface ParsedHeadlineHeader {
    stars: number;
    todoKeyword?: string;
    priority?: string;
    title: string;
    tags: string[];
}

function parseHeadlineHeader(line: string): ParsedHeadlineHeader | null {
    const match = line.match(HEADLINE_REGEX);
    if (!match) return null;

    const stars = match[1].length;
    let rest = match[2].trim();

    // 1. Tags: trailing :tag1:tag2:
    let tags: string[] = [];
    const tagMatch = rest.match(/\s+:([a-zA-Z0-9_@#%:]+):\s*$/);
    if (tagMatch) {
        tags = tagMatch[1].split(":").filter(Boolean);
        rest = rest.slice(0, tagMatch.index).trim();
    }

    // 2. TODO keyword
    let todoKeyword: string | undefined;
    const todoMatch = rest.match(/^([A-Z]{2,})\s+(.*)$/);
    if (todoMatch && KNOWN_TODO_KEYWORDS.has(todoMatch[1])) {
        todoKeyword = todoMatch[1];
        rest = todoMatch[2].trim();
    }

    // 3. Priority: [#A]
    let priority: string | undefined;
    const prioMatch = rest.match(/^\[#([a-zA-Z0-9])\]\s+(.*)$/);
    if (prioMatch) {
        priority = prioMatch[1].toUpperCase();
        rest = prioMatch[2].trim();
    }

    return {
        stars,
        todoKeyword,
        priority,
        title: rest,
        tags,
    };
}

// =============================================================================
// List Parser Helpers
// =============================================================================

interface BulletMatch {
    indent: number;
    bullet: string;
    isOrdered: boolean;
    rest: string;
}

function matchBullet(line: string): BulletMatch | null {
    // Unordered: -, + or indented *
    // Ordered: 1. or 1)
    const match = line.match(
        /^(\s*)(?:([-+])\s+|(\*(?!\*))\s+|(\d+[.)])\s+)(.*)$/,
    );
    if (!match) return null;

    const indent = match[1].length;
    const unorderedDashPlus = match[2];
    const unorderedStar = match[3];
    const ordered = match[4];
    const rest = match[5];

    // Org-mode rule: * is only a list bullet if indented by at least one space
    if (unorderedStar !== undefined && indent === 0) {
        return null;
    }

    const bullet = unorderedDashPlus ?? unorderedStar ?? ordered;
    const isOrdered = ordered !== undefined;

    return { indent, bullet, isOrdered, rest };
}

interface ParsedListItem {
    item: OrgListItemElement;
    rawBodyLines: string[];
}

function createListItem(bullet: string, rest: string): ParsedListItem {
    let checked: boolean | "indeterminate" | undefined;
    let counterCookie: string | undefined;
    let tagText: string | undefined;
    let bodyText = rest;

    // 1. Checkbox: [ ], [X], [x], [-]
    const checkMatch = bodyText.match(/^\[([ Xx-])\]\s+(.*)$/);
    if (checkMatch) {
        const mark = checkMatch[1];
        checked = mark === " " ? false : (mark === "-" ? "indeterminate" : true);
        bodyText = checkMatch[2];
    }

    // 2. Counter cookie: [2/5] or [40%]
    const cookieMatch = bodyText.match(/^(\[\d+\/\d+\]|\[\d+%\])\s+(.*)$/);
    if (cookieMatch) {
        counterCookie = cookieMatch[1];
        bodyText = cookieMatch[2];
    }

    // 3. Description item: <tag> :: <content>
    const descMatch = bodyText.match(/^(.+?)\s+::(?:\s+(.*)|$)/);
    if (descMatch) {
        tagText = descMatch[1].trim();
        bodyText = descMatch[2] ?? "";
    }

    const item: OrgListItemElement = {
        type: "list_item",
        bullet,
        tag: tagText !== undefined ? parseOrgInline(tagText) : undefined,
        checked,
        counterCookie,
        children: [],
    };

    return {
        item,
        rawBodyLines: bodyText ? [bodyText] : [],
    };
}

// =============================================================================
// Table Normalization Helper
// =============================================================================

function normalizeTable(
    table: OrgTableElement,
    rawRows: { isRule: boolean; cells: string[] }[],
): void {
    let maxColumns = 0;
    for (const r of rawRows) {
        if (!r.isRule && r.cells.length > maxColumns) {
            maxColumns = r.cells.length;
        }
    }

    const parsedRows: OrgTableRowElement[] = [];
    const alignments: OrgTableColumnAlignment[] = [];

    for (let c = 0; c < maxColumns; c++) {
        alignments.push("default");
    }

    for (const r of rawRows) {
        if (r.isRule) {
            parsedRows.push({
                type: "table_row",
                isRule: true,
                cells: [],
            });
        } else {
            const rowCells: OrgTableCellObject[] = [];
            for (let c = 0; c < maxColumns; c++) {
                const rawCell = r.cells[c] ?? "";
                const trimmed = rawCell.trim();

                // Check for column alignment specifier row: <l>, <c>, <r>
                const alignMatch = trimmed.match(/^<([lcr])\d*>$/i);
                if (alignMatch) {
                    const char = alignMatch[1].toLowerCase();
                    if (char === "l") alignments[c] = "left";
                    else if (char === "c") alignments[c] = "center";
                    else if (char === "r") alignments[c] = "right";
                }

                rowCells.push({
                    type: "table_cell",
                    children: parseOrgInline(trimmed),
                });
            }

            parsedRows.push({
                type: "table_row",
                isRule: false,
                cells: rowCells,
            });
        }
    }

    table.rows = parsedRows;
    table.alignments = alignments;
}

// =============================================================================
// Main Block Parser
// =============================================================================

/**
 * Parses raw Org-mode document text into a strongly-typed OrgDocumentElement AST.
 *
 * Traverses lines sequentially with O(N) time complexity, managing headline hierarchies,
 * drawer state, block delimiters, pipe tables, nested lists, and paragraph accumulation.
 */
export function parseOrgBlocks(content: string): OrgDocumentElement {
    const doc: OrgDocumentElement = {
        type: "document",
        properties: {},
        children: [],
    };

    const lines = content.split(/\r?\n/);
    const totalLines = lines.length;
    let i = 0;

    // Headline hierarchy stack: innermost headline at top of stack
    const headlineStack: OrgHeadlineElement[] = [];

    // Affiliated keyword buffer awaiting next structural element
    const pendingKeywords: OrgKeywordElement[] = [];

    /**
     * Appends an element to the current container (either the innermost headline or document root).
     */
    function appendElement(el: OrgElement): void {
        if (headlineStack.length > 0) {
            headlineStack[headlineStack.length - 1].children.push(el);
        } else {
            doc.children.push(el);
        }
    }

    /**
     * Flushes buffered keywords as standalone keyword elements into the current container.
     */
    function flushPendingKeywords(): void {
        if (pendingKeywords.length === 0) return;
        for (const kw of pendingKeywords) {
            appendElement(kw);
        }
        pendingKeywords.length = 0;
    }

    while (i < totalLines) {
        const line = lines[i];
        const trimmed = line.trim();

        // ---------------------------------------------------------------------
        // 1. Empty line
        // ---------------------------------------------------------------------
        if (trimmed.length === 0) {
            // A blank line detaches pending keywords from following elements
            flushPendingKeywords();
            i++;
            continue;
        }

        // ---------------------------------------------------------------------
        // 2. Block delimiters (#+BEGIN_... / #+BEGIN: ...)
        // Note: Matched BEFORE keyword regex to ensure blocks take precedence.
        // ---------------------------------------------------------------------
        const blockStartMatch = line.match(BLOCK_START_REGEX);
        if (blockStartMatch) {
            const blockType = (blockStartMatch[1] || blockStartMatch[2] || "")
                .toLowerCase();
            const restArgs = blockStartMatch[3]?.trim() || "";

            i++;
            const bodyLines: string[] = [];
            while (i < totalLines) {
                const currentLine = lines[i];
                if (BLOCK_END_REGEX.test(currentLine)) {
                    i++;
                    break;
                }
                // Handle Org comma-escaping: lines starting with ,#
                if (currentLine.startsWith(",#")) {
                    bodyLines.push(currentLine.slice(1));
                } else {
                    bodyLines.push(currentLine);
                }
                i++;
            }

            if (blockStartMatch[2] !== undefined) {
                // Dynamic block (#+BEGIN: name args)
                const dynBlock: OrgDynamicBlockElement = {
                    type: "dynamic_block",
                    name: blockType,
                    arguments: restArgs || undefined,
                    value: bodyLines.join("\n"),
                };
                flushPendingKeywords();
                appendElement(dynBlock);
            } else {
                // Regular structural block (#+BEGIN_SRC, #+BEGIN_QUOTE, etc.)
                let language: string | undefined;
                let args: string | undefined;

                if (blockType === "src" || blockType === "export") {
                    const parts = restArgs.split(/\s+/);
                    language = parts[0] ? parts[0].toLowerCase() : undefined;
                    args = parts.slice(1).join(" ") || undefined;
                } else {
                    args = restArgs || undefined;
                }

                const block: OrgBlockElement = {
                    type: "block",
                    blockType,
                    language,
                    arguments: args,
                    value: bodyLines.join("\n"),
                };

                attachAffiliatedKeywords(block, pendingKeywords);
                appendElement(block);
            }
            continue;
        }

        // ---------------------------------------------------------------------
        // 3. In-buffer keywords & metadata comments (#+KEY: VALUE)
        // ---------------------------------------------------------------------
        const keywordMatch = line.match(KEYWORD_REGEX);
        if (keywordMatch) {
            const rawKey = keywordMatch[1];
            const normKey = rawKey.toLowerCase();
            const optArg = keywordMatch[2] || undefined;
            const val = keywordMatch[3];

            // Capture document-level properties
            if (
                doc.properties &&
                (normKey === "title" || normKey === "author" ||
                    normKey === "date" || normKey === "options")
            ) {
                doc.properties[normKey] = val.trim();
                if (normKey === "title") {
                    doc.title = val.trim();
                }
            }

            const kwElement: OrgKeywordElement = {
                type: "keyword",
                key: normKey,
                optionalArg: optArg,
                value: val,
                raw: line,
            };

            pendingKeywords.push(kwElement);
            i++;
            continue;
        }

        // ---------------------------------------------------------------------
        // 4. Standalone comments (# ...)
        // ---------------------------------------------------------------------
        const commentMatch = line.match(COMMENT_REGEX);
        if (commentMatch) {
            flushPendingKeywords();
            const comment: OrgCommentElement = {
                type: "comment",
                value: commentMatch[1] ?? "",
            };
            appendElement(comment);
            i++;
            continue;
        }

        // ---------------------------------------------------------------------
        // 5. Headlines (* to ****** Title)
        // ---------------------------------------------------------------------
        const headlineHeader = parseHeadlineHeader(line);
        if (headlineHeader) {
            flushPendingKeywords();

            const headline: OrgHeadlineElement = {
                type: "headline",
                level: headlineHeader.stars,
                todoKeyword: headlineHeader.todoKeyword,
                priority: headlineHeader.priority,
                title: parseOrgInline(headlineHeader.title),
                tags: headlineHeader.tags,
                children: [],
            };

            // Check next line for Planning information (DEADLINE / SCHEDULED / CLOSED)
            if (i + 1 < totalLines && PLANNING_REGEX.test(lines[i + 1])) {
                i++;
                const planLine = lines[i];
                const planning: OrgPlanningElement = {
                    type: "planning",
                    raw: planLine,
                };
                for (const pMatch of planLine.matchAll(PLANNING_ITEM_REGEX)) {
                    const key = pMatch[1].toUpperCase();
                    const value = pMatch[2];
                    if (key === "CLOSED") planning.closed = value;
                    else if (key === "DEADLINE") planning.deadline = value;
                    else if (key === "SCHEDULED") planning.scheduled = value;
                }
                headline.planning = planning;
            }

            // Check next line for Property Drawer (:PROPERTIES: ... :END:)
            if (
                i + 1 < totalLines &&
                lines[i + 1].trim().toUpperCase() === ":PROPERTIES:"
            ) {
                i += 2; // advance past headline/planning and :PROPERTIES:
                const props: Record<string, string> = {};
                const nodeProps: {
                    type: "node_property";
                    key: string;
                    value: string;
                }[] = [];

                while (i < totalLines) {
                    const cur = lines[i];
                    if (DRAWER_END_REGEX.test(cur)) {
                        i++;
                        break;
                    }
                    const propMatch = cur.match(NODE_PROPERTY_REGEX);
                    if (propMatch) {
                        const k = propMatch[1];
                        const v = propMatch[2].trim();
                        props[k] = v;
                        nodeProps.push({
                            type: "node_property",
                            key: k,
                            value: v,
                        });
                    }
                    i++;
                }

                headline.properties = props;
                const propDrawer: OrgPropertyDrawerElement = {
                    type: "property_drawer",
                    properties: props,
                    children: nodeProps,
                };
                headline.children.push(propDrawer);
                i--; // adjust so outer loop increment moves to next token
            }

            // Adjust headline stack for hierarchy nesting
            while (
                headlineStack.length > 0 &&
                headlineStack[headlineStack.length - 1].level >= headline.level
            ) {
                headlineStack.pop();
            }

            if (headlineStack.length === 0) {
                doc.children.push(headline);
            } else {
                headlineStack[headlineStack.length - 1].children.push(headline);
            }

            headlineStack.push(headline);
            i++;
            continue;
        }

        // ---------------------------------------------------------------------
        // 6. Drawers (:LOGBOOK: ... :END: or standalone :PROPERTIES:)
        // ---------------------------------------------------------------------
        const drawerMatch = trimmed.match(DRAWER_START_REGEX);
        if (drawerMatch && !trimmed.startsWith("::")) {
            const drawerName = drawerMatch[1];
            flushPendingKeywords();
            i++;

            if (drawerName.toUpperCase() === "PROPERTIES") {
                const props: Record<string, string> = {};
                const nodeProps: {
                    type: "node_property";
                    key: string;
                    value: string;
                }[] = [];
                while (i < totalLines) {
                    const cur = lines[i];
                    if (DRAWER_END_REGEX.test(cur)) {
                        i++;
                        break;
                    }
                    const propMatch = cur.match(NODE_PROPERTY_REGEX);
                    if (propMatch) {
                        const k = propMatch[1];
                        const v = propMatch[2].trim();
                        props[k] = v;
                        nodeProps.push({
                            type: "node_property",
                            key: k,
                            value: v,
                        });
                    }
                    i++;
                }
                const propDrawer: OrgPropertyDrawerElement = {
                    type: "property_drawer",
                    properties: props,
                    children: nodeProps,
                };
                appendElement(propDrawer);
            } else {
                const drawerLines: string[] = [];
                while (i < totalLines) {
                    const cur = lines[i];
                    if (DRAWER_END_REGEX.test(cur)) {
                        i++;
                        break;
                    }
                    drawerLines.push(cur);
                    i++;
                }
                const drawer: OrgDrawerElement = {
                    type: "drawer",
                    name: drawerName,
                    lines: drawerLines,
                };
                appendElement(drawer);
            }
            continue;
        }

        // ---------------------------------------------------------------------
        // 7. Horizontal Rules (-----)
        // ---------------------------------------------------------------------
        if (HORIZONTAL_RULE_REGEX.test(line)) {
            flushPendingKeywords();
            const hr: OrgHorizontalRuleElement = { type: "horizontal_rule" };
            appendElement(hr);
            i++;
            continue;
        }

        // ---------------------------------------------------------------------
        // 8. LaTeX Environment (\begin{equation} ... \end{equation})
        // ---------------------------------------------------------------------
        const latexEnvMatch = line.match(LATEX_ENV_START_REGEX);
        if (latexEnvMatch) {
            const envName = latexEnvMatch[1];
            const envLines: string[] = [line];
            const endRegex = new RegExp(`^\\s*\\\\end\\{${envName}\\}`, "i");
            i++;
            while (i < totalLines) {
                const cur = lines[i];
                envLines.push(cur);
                i++;
                if (endRegex.test(cur)) break;
            }
            const latexEnv: OrgLatexEnvironmentElement = {
                type: "latex_environment",
                value: envLines.join("\n"),
            };
            attachAffiliatedKeywords(latexEnv, pendingKeywords);
            appendElement(latexEnv);
            continue;
        }

        // ---------------------------------------------------------------------
        // 9. Footnote Definition ([fn:label] content)
        // ---------------------------------------------------------------------
        const footnoteMatch = line.match(FOOTNOTE_DEF_REGEX);
        if (footnoteMatch) {
            flushPendingKeywords();
            const label = footnoteMatch[1];
            const contentLine = footnoteMatch[2];
            const footnote: OrgFootnoteDefinitionElement = {
                type: "footnote_definition",
                label,
                children: [
                    {
                        type: "paragraph",
                        children: parseOrgInline(contentLine),
                    },
                ],
            };
            appendElement(footnote);
            i++;
            continue;
        }

        // ---------------------------------------------------------------------
        // 10. Pipe Tables (| col1 | col2 |)
        // ---------------------------------------------------------------------
        if (TABLE_ROW_REGEX.test(line)) {
            const tableElement: OrgTableElement = {
                type: "table",
                rows: [],
            };
            attachAffiliatedKeywords(tableElement, pendingKeywords);

            const rawRows: { isRule: boolean; cells: string[] }[] = [];
            while (i < totalLines && TABLE_ROW_REGEX.test(lines[i])) {
                const cur = lines[i].trim();
                // Strip outer pipes
                const inner = cur.replace(/^\|/, "").replace(/\|$/, "");
                const isRule = inner.length === 0 || /^[-+\s|]+$/.test(inner);

                if (isRule) {
                    rawRows.push({ isRule: true, cells: [] });
                } else {
                    const segments = inner.split("|");
                    rawRows.push({ isRule: false, cells: segments });
                }
                i++;
            }

            normalizeTable(tableElement, rawRows);
            appendElement(tableElement);
            continue;
        }

        // ---------------------------------------------------------------------
        // 11. Plain Lists & Nested Lists
        // ---------------------------------------------------------------------
        const bulletInfo = matchBullet(line);
        if (bulletInfo) {
            const listElement: OrgListElement = {
                type: "list",
                ordered: bulletInfo.isOrdered,
                children: [],
            };
            attachAffiliatedKeywords(listElement, pendingKeywords);

            const allParsedItems: ParsedListItem[] = [];

            // Stack tracking nested lists: { indent, list, currentItem }
            type ListStackEntry = {
                indent: number;
                list: OrgListElement;
                currentItem: ParsedListItem;
            };

            const rootParsed = createListItem(
                bulletInfo.bullet,
                bulletInfo.rest,
            );
            allParsedItems.push(rootParsed);
            listElement.children.push(rootParsed.item);

            const listStack: ListStackEntry[] = [
                {
                    indent: bulletInfo.indent,
                    list: listElement,
                    currentItem: rootParsed,
                },
            ];

            i++;
            while (i < totalLines) {
                const cur = lines[i];
                const curTrimmed = cur.trim();

                // Empty line check
                if (curTrimmed.length === 0) {
                    // Two consecutive empty lines terminate the list
                    if (
                        i + 1 < totalLines && lines[i + 1].trim().length === 0
                    ) {
                        break;
                    }
                    // Check if next non-empty line belongs to list
                    let nextNonEmpty = i + 1;
                    while (
                        nextNonEmpty < totalLines &&
                        lines[nextNonEmpty].trim().length === 0
                    ) {
                        nextNonEmpty++;
                    }
                    if (nextNonEmpty >= totalLines) break;

                    const nextBullet = matchBullet(lines[nextNonEmpty]);
                    if (!nextBullet && !lines[nextNonEmpty].startsWith(" ")) {
                        // Unindented text after empty line ends the list
                        break;
                    }
                    i++;
                    continue;
                }

                // If line begins another structural block, terminate list
                if (
                    HEADLINE_REGEX.test(cur) ||
                    BLOCK_START_REGEX.test(cur) ||
                    KEYWORD_REGEX.test(cur) ||
                    DRAWER_START_REGEX.test(curTrimmed) ||
                    TABLE_ROW_REGEX.test(cur) ||
                    HORIZONTAL_RULE_REGEX.test(cur)
                ) {
                    break;
                }

                const curBullet = matchBullet(cur);
                if (curBullet) {
                    const top = listStack[listStack.length - 1];

                    if (curBullet.indent > top.indent) {
                        // Push nested list as child of previous list item
                        const childList: OrgListElement = {
                            type: "list",
                            ordered: curBullet.isOrdered,
                            children: [],
                        };
                        top.currentItem.item.children.push(childList);

                        const childParsed = createListItem(
                            curBullet.bullet,
                            curBullet.rest,
                        );
                        allParsedItems.push(childParsed);
                        childList.children.push(childParsed.item);

                        listStack.push({
                            indent: curBullet.indent,
                            list: childList,
                            currentItem: childParsed,
                        });
                    } else {
                        // Pop back to matching indentation level
                        while (
                            listStack.length > 1 &&
                            curBullet.indent <
                                listStack[listStack.length - 1].indent
                        ) {
                            listStack.pop();
                        }

                        const active = listStack[listStack.length - 1];

                        // If bullet order type changed at the same level, it terminates the active list
                        if (
                            curBullet.indent === active.indent &&
                            curBullet.isOrdered !== active.list.ordered
                        ) {
                            break;
                        }

                        const newParsed = createListItem(
                            curBullet.bullet,
                            curBullet.rest,
                        );
                        allParsedItems.push(newParsed);
                        active.list.children.push(newParsed.item);
                        active.currentItem = newParsed;
                    }
                    i++;
                    continue;
                }

                // Continuation line of the current list item
                const top = listStack[listStack.length - 1];
                if (cur.startsWith(" ") || cur.startsWith("\t")) {
                    top.currentItem.rawBodyLines.push(curTrimmed);
                    i++;
                } else {
                    // Unindented line terminates list
                    break;
                }
            }

            // Finalize inline text for all parsed list items
            for (const parsed of allParsedItems) {
                const text = parsed.rawBodyLines.join(" ");
                if (text.length > 0) {
                    const inlines = parseOrgInline(text);
                    parsed.item.children.unshift(...inlines);
                }
            }

            appendElement(listElement);
            continue;
        }

        // ---------------------------------------------------------------------
        // 12. Fixed-Width Elements (: verbatim)
        // ---------------------------------------------------------------------
        const fixedWidthMatch = line.match(FIXED_WIDTH_REGEX);
        if (fixedWidthMatch && !DRAWER_START_REGEX.test(trimmed)) {
            const fixedLines: string[] = [fixedWidthMatch[1] ?? ""];
            const fixedElement: OrgFixedWidthElement = {
                type: "fixed_width",
                value: "",
            };
            attachAffiliatedKeywords(fixedElement, pendingKeywords);

            i++;
            while (i < totalLines) {
                const cur = lines[i];
                if (DRAWER_START_REGEX.test(cur.trim())) break;
                const m = cur.match(FIXED_WIDTH_REGEX);
                if (!m) break;
                fixedLines.push(m[1] ?? "");
                i++;
            }

            fixedElement.value = fixedLines.join("\n");
            appendElement(fixedElement);
            continue;
        }

        // ---------------------------------------------------------------------
        // 13. Paragraphs (Prose lines grouped until blank line or block start)
        // ---------------------------------------------------------------------
        const paragraphLines: string[] = [line];
        const paraElement: OrgParagraphElement = {
            type: "paragraph",
            children: [],
        };
        attachAffiliatedKeywords(paraElement, pendingKeywords);

        i++;
        while (i < totalLines) {
            const cur = lines[i];
            const curTrim = cur.trim();

            if (curTrim.length === 0) break;
            if (
                HEADLINE_REGEX.test(cur) ||
                BLOCK_START_REGEX.test(cur) ||
                KEYWORD_REGEX.test(cur) ||
                COMMENT_REGEX.test(cur) ||
                DRAWER_START_REGEX.test(curTrim) ||
                HORIZONTAL_RULE_REGEX.test(cur) ||
                TABLE_ROW_REGEX.test(cur) ||
                matchBullet(cur) !== null ||
                LATEX_ENV_START_REGEX.test(cur) ||
                FOOTNOTE_DEF_REGEX.test(cur) ||
                FIXED_WIDTH_REGEX.test(cur)
            ) {
                break;
            }

            paragraphLines.push(cur);
            i++;
        }

        const paraText = paragraphLines.join("\n");
        paraElement.children = parseOrgInline(paraText);
        appendElement(paraElement);
    }

    // Flush any remaining trailing keywords
    flushPendingKeywords();

    return doc;
}
