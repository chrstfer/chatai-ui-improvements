/**
 * Pure AST Serializer for Org-Mode Documents and Subtrees.
 * Headless and deterministic with zero DOM/Preact dependencies.
 * Converts Org AST nodes back into canonical Org-mode plaintext.
 */

import type {
    OrgBlockElement,
    OrgDynamicBlockElement,
    OrgElement,
    OrgHeadlineElement,
    OrgKeywordElement,
    OrgLatexEnvironmentElement,
    OrgListElement,
    OrgObject,
    OrgParagraphElement,
    OrgPlanningElement,
    OrgTableElement,
} from "./types.ts";

/**
 * Serializes inline phrasing objects back to Org markup string.
 */
export function serializeOrgObjects(objects?: readonly OrgObject[] | OrgObject | null): string {
    if (!objects) return "";
    const items = Array.isArray(objects) ? objects : [objects];

    return items.map((obj): string => {
        switch (obj.type) {
            case "text":
                return obj.value;
            case "bold":
                return `*${serializeOrgObjects(obj.children)}*`;
            case "italic":
                return `/${serializeOrgObjects(obj.children)}/`;
            case "underline":
                return `_${serializeOrgObjects(obj.children)}_`;
            case "strike":
                return `+${serializeOrgObjects(obj.children)}+`;
            case "code":
                return `~${obj.value}~`;
            case "verbatim":
                return `=${obj.value}=`;
            case "link":
                if (obj.description && obj.description.length > 0) {
                    return `[[${obj.url}][${serializeOrgObjects(obj.description)}]]`;
                }
                return `[[${obj.url}]]`;
            case "macro":
                return obj.raw || `{{{${obj.name}${obj.args?.length ? `(${obj.args.join(",")})` : ""}}}}`;
            case "latex_fragment":
                return obj.value;
            case "entity":
                return `\\${obj.name}`;
            case "statistics_cookie":
                return obj.value;
            case "line_break":
                return "\\\\\n";
            case "subscript":
                return `_${typeof obj.value === "string" ? obj.value : `{${serializeOrgObjects(obj.value)}}`}`;
            case "superscript":
                return `^${typeof obj.value === "string" ? obj.value : `{${serializeOrgObjects(obj.value)}}`}`;
            case "timestamp":
                return obj.raw;
            case "footnote_reference":
                return `[fn:${obj.label}]`;
            case "table_cell":
                return serializeOrgObjects(obj.children);
            case "target":
                return `<<${obj.value}>>`;
            case "radio_target":
                return `<<<${serializeOrgObjects(obj.children)}>>>`;
            default:
                return "value" in obj && typeof (obj as { value?: unknown }).value === "string"
                    ? (obj as { value: string }).value
                    : "";
        }
    }).join("");
}

/**
 * Serializes an Org planning element (SCHEDULED / DEADLINE / CLOSED).
 */
export function serializePlanning(planning: OrgPlanningElement): string {
    const parts: string[] = [];
    if (planning.closed) parts.push(`CLOSED: ${planning.closed}`);
    if (planning.deadline) parts.push(`DEADLINE: ${planning.deadline}`);
    if (planning.scheduled) parts.push(`SCHEDULED: ${planning.scheduled}`);
    return parts.join(" ");
}

/**
 * Serializes a property drawer into :PROPERTIES: ... :END:.
 */
export function serializePropertyDrawer(properties: Record<string, string>): string {
    const lines = [":PROPERTIES:"];
    for (const [key, value] of Object.entries(properties)) {
        lines.push(`:${key}: ${value}`);
    }
    lines.push(":END:");
    return lines.join("\n");
}

function serializeNode(node: OrgElement | OrgObject): string {
    if (!node || !("type" in node)) return "";
    const objectTypes = new Set([
        "text",
        "bold",
        "italic",
        "underline",
        "strike",
        "code",
        "verbatim",
        "link",
        "macro",
        "latex_fragment",
        "entity",
        "statistics_cookie",
        "line_break",
        "subscript",
        "superscript",
        "timestamp",
        "table_cell",
        "footnote_reference",
        "target",
        "radio_target",
    ]);

    if (objectTypes.has(node.type)) {
        return serializeOrgObjects(node as OrgObject);
    }
    return serializeOrgElement(node as OrgElement);
}

/**
 * Serializes a single Org structural element (non-headline).
 */
export function serializeOrgElement(elem: OrgElement): string {
    switch (elem.type) {
        case "paragraph":
            return serializeOrgObjects((elem as OrgParagraphElement).children);

        case "block": {
            const block = elem as OrgBlockElement;
            const lines: string[] = [];
            if (block.name) lines.push(`#+NAME: ${block.name}`);
            if (block.caption) lines.push(`#+CAPTION: ${serializeOrgObjects(block.caption)}`);
            const lang = block.language ? ` ${block.language}` : "";
            const args = block.arguments ? ` ${block.arguments}` : "";
            lines.push(`#+BEGIN_${block.blockType.toUpperCase()}${lang}${args}`);
            if (block.value) lines.push(block.value);
            lines.push(`#+END_${block.blockType.toUpperCase()}`);
            return lines.join("\n");
        }

        case "dynamic_block": {
            const dyn = elem as OrgDynamicBlockElement;
            const lines: string[] = [];
            lines.push(`#+BEGIN: ${dyn.name}${dyn.arguments ? ` ${dyn.arguments}` : ""}`);
            if (dyn.value) lines.push(dyn.value);
            lines.push("#+END:");
            return lines.join("\n");
        }

        case "latex_environment": {
            const env = elem as OrgLatexEnvironmentElement;
            return env.value;
        }

        case "table": {
            const tbl = elem as OrgTableElement;
            const lines: string[] = [];
            for (const row of tbl.rows) {
                if (row.isRule) {
                    lines.push("|---|");
                } else {
                    const cells = row.cells.map((c) => ` ${serializeOrgObjects(c.children)} `);
                    lines.push(`|${cells.join("|")}|`);
                }
            }
            return lines.join("\n");
        }

        case "list": {
            const list = elem as OrgListElement;
            const lines: string[] = [];
            list.children.forEach((item, idx) => {
                const bullet = list.ordered ? `${idx + 1}. ` : "- ";
                let itemHeader = bullet;
                if (item.checked !== undefined) {
                    itemHeader += item.checked ? "[X] " : "[ ] ";
                }
                if (item.counterCookie) {
                    itemHeader += `${item.counterCookie} `;
                }
                if (item.tag) {
                    itemHeader += `${serializeOrgObjects(item.tag)} :: `;
                }

                const itemChildren = item.children || [];
                const childTexts = itemChildren.map(serializeNode).join("\n");
                lines.push(`${itemHeader}${childTexts}`);
            });
            return lines.join("\n");
        }

        case "horizontal_rule":
            return "-----";

        case "comment":
            return `# ${(elem as { value: string }).value}`;

        case "fixed_width": {
            const fw = elem as { value: string };
            return fw.value.split("\n").map((l) => `: ${l}`).join("\n");
        }

        case "keyword": {
            const kw = elem as OrgKeywordElement;
            return `#+${kw.key.toUpperCase()}: ${kw.value}`;
        }

        default:
            if ("children" in elem && Array.isArray((elem as { children?: OrgElement[] }).children)) {
                return (elem as { children: OrgElement[] }).children.map(serializeOrgElement).join("\n");
            }
            return "";
    }
}

/**
 * Serializes an Org headline and its complete subtree (planning, properties,
 * body content, and nested child headlines) into canonical Org-mode plaintext.
 *
 * Honors live `todoOverrides` if provided.
 */
export function serializeOrgSubtree(
    headline: OrgHeadlineElement,
    todoOverrides?: Readonly<Record<string, string>>,
    headlinePath?: string,
): string {
    const lines: string[] = [];
    const currentPath = headlinePath || "h-0";

    // 1. Headline header line
    const stars = "*".repeat(Math.max(1, headline.level));
    const todo = (todoOverrides && todoOverrides[currentPath]) ?? headline.todoKeyword;
    const todoPart = todo ? ` ${todo}` : "";
    const priorityPart = headline.priority ? ` [#${headline.priority}]` : "";
    const titleText = serializeOrgObjects(headline.title);
    const tagsPart = headline.tags && headline.tags.length > 0 ? ` :${headline.tags.join(":")}:` : "";

    lines.push(`${stars}${todoPart}${priorityPart} ${titleText}${tagsPart}`);

    // 2. Planning element
    if (headline.planning) {
        lines.push(serializePlanning(headline.planning));
    }

    // 3. Properties drawer
    if (headline.properties && Object.keys(headline.properties).length > 0) {
        lines.push(serializePropertyDrawer(headline.properties));
    }

    // 4. Children (body elements + recursive child headlines)
    let childHeadlineCount = 0;
    for (let i = 0; i < headline.children.length; i++) {
        const child = headline.children[i];
        if (child.type === "headline") {
            const childPath = `${currentPath}.${childHeadlineCount}`;
            childHeadlineCount++;
            lines.push(serializeOrgSubtree(child, todoOverrides, childPath));
        } else {
            const serialized = serializeOrgElement(child);
            if (serialized) {
                lines.push(serialized);
            }
        }
    }

    return lines.join("\n");
}
