import { assertEquals, assertExists } from "@std/assert";
import { parseOrgDocument } from "../../../src/languages/org/ast/parser.ts";
import type {
    OrgBlockElement,
    OrgDynamicBlockElement,
    OrgHeadlineElement,
    OrgKeywordElement,
    OrgLatexEnvironmentElement,
    OrgListElement,
    OrgParagraphElement,
    OrgPropertyDrawerElement,
    OrgTableElement,
} from "../../../src/languages/org/ast/types.ts";

Deno.test("parseOrgBlocks: Disambiguates block delimiters from keywords", () => {
    const input = [
        "#+TITLE: Disambiguation Test",
        "#+AUTHOR: DeepMind",
        "",
        "#+BEGIN_SRC python",
        "def hello():",
        "    print('world')",
        "#+END_SRC",
        "",
        "#+BEGIN_QUOTE",
        "A famous quote.",
        "#+END_QUOTE",
    ].join("\n");

    const doc = parseOrgDocument(input);

    assertEquals(doc.title, "Disambiguation Test");
    assertEquals(doc.properties?.title, "Disambiguation Test");
    assertEquals(doc.properties?.author, "DeepMind");

    // Children should have: 2 standalone keywords (detached by blank line), 1 src block, 1 quote block
    assertEquals(doc.children.length, 4);

    const srcBlock = doc.children[2] as OrgBlockElement;
    assertEquals(srcBlock.type, "block");
    assertEquals(srcBlock.blockType, "src");
    assertEquals(srcBlock.language, "python");
    assertEquals(srcBlock.value, "def hello():\n    print('world')");

    const quoteBlock = doc.children[3] as OrgBlockElement;
    assertEquals(quoteBlock.type, "block");
    assertEquals(quoteBlock.blockType, "quote");
    assertEquals(quoteBlock.value, "A famous quote.");
});

Deno.test("parseOrgBlocks: Dynamic block parsing", () => {
    const input = [
        "#+BEGIN: clocktable :maxlevel 2 :scope file",
        "| Headline | Time |",
        "| Task 1   | 1:00 |",
        "#+END:",
    ].join("\n");

    const doc = parseOrgDocument(input);
    assertEquals(doc.children.length, 1);

    const dyn = doc.children[0] as OrgDynamicBlockElement;
    assertEquals(dyn.type, "dynamic_block");
    assertEquals(dyn.name, "clocktable");
    assertEquals(dyn.arguments, ":maxlevel 2 :scope file");
    assertEquals(dyn.value, "| Headline | Time |\n| Task 1   | 1:00 |");
});

Deno.test("parseOrgBlocks: Affiliated keywords scope to following element and are omitted from container children", () => {
    const input = [
        "#+NAME: compute_fn",
        "#+CAPTION: A mathematical function",
        "#+ATTR_HTML: :width 500",
        "#+BEGIN_SRC typescript",
        "export function compute() { return 10; }",
        "#+END_SRC",
    ].join("\n");

    const doc = parseOrgDocument(input);

    // Because the keywords immediately precede the block, they are affiliated and NOT separate siblings
    assertEquals(doc.children.length, 1);

    const block = doc.children[0] as OrgBlockElement;
    assertEquals(block.type, "block");
    assertEquals(block.name, "compute_fn");
    assertExists(block.caption);
    assertEquals(block.attributes?.attr_html, ":width 500");
    assertEquals(block.affiliatedKeywords?.length, 3);
});

Deno.test("parseOrgBlocks: Standalone keywords separated by blank line remain in children", () => {
    const input = [
        "#+NAME: detached_name",
        "",
        "#+BEGIN_SRC rust",
        "fn main() {}",
        "#+END_SRC",
    ].join("\n");

    const doc = parseOrgDocument(input);

    // Detached keyword is a standalone child
    assertEquals(doc.children.length, 2);
    const kw = doc.children[0] as OrgKeywordElement;
    assertEquals(kw.type, "keyword");
    assertEquals(kw.key, "name");
    assertEquals(kw.value.trim(), "detached_name");

    const block = doc.children[1] as OrgBlockElement;
    assertEquals(block.type, "block");
    assertEquals(block.name, undefined); // Not affiliated
});

Deno.test("parseOrgBlocks: Headline hierarchy nesting via level stack", () => {
    const input = [
        "* Level 1 Heading",
        "Paragraph in level 1.",
        "** Level 2 Child",
        "Paragraph in level 2.",
        "*** Level 3 Grandchild",
        "Deep text.",
        "* Sibling Level 1",
        "Sibling text.",
    ].join("\n");

    const doc = parseOrgDocument(input);

    // Root should contain 2 top-level headlines
    assertEquals(doc.children.length, 2);

    const h1 = doc.children[0] as OrgHeadlineElement;
    assertEquals(h1.level, 1);
    assertEquals(h1.title[0], { type: "text", value: "Level 1 Heading" });

    // h1 should have: paragraph, then h2
    assertEquals(h1.children.length, 2);
    assertEquals(h1.children[0].type, "paragraph");

    const h2 = h1.children[1] as OrgHeadlineElement;
    assertEquals(h2.level, 2);
    assertEquals(h2.title[0], { type: "text", value: "Level 2 Child" });

    // h2 should have: paragraph, then h3
    assertEquals(h2.children.length, 2);
    assertEquals(h2.children[0].type, "paragraph");

    const h3 = h2.children[1] as OrgHeadlineElement;
    assertEquals(h3.level, 3);
    assertEquals(h3.title[0], { type: "text", value: "Level 3 Grandchild" });
    assertEquals(h3.children.length, 1);

    // Sibling level 1
    const h1Sibling = doc.children[1] as OrgHeadlineElement;
    assertEquals(h1Sibling.level, 1);
    assertEquals(h1Sibling.title[0], { type: "text", value: "Sibling Level 1" });
    assertEquals(h1Sibling.children.length, 1);
});

Deno.test("parseOrgBlocks: Headline TODO keywords, priorities, tags, and planning", () => {
    const input = [
        "* TODO [#A] Urgent task with *bold* :work:urgent:",
        "DEADLINE: <2026-09-10 Thu> SCHEDULED: <2026-09-08 Tue> CLOSED: [2026-09-08 Tue 12:00]",
        "Task description paragraph.",
    ].join("\n");

    const doc = parseOrgDocument(input);
    assertEquals(doc.children.length, 1);

    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.level, 1);
    assertEquals(headline.todoKeyword, "TODO");
    assertEquals(headline.priority, "A");
    assertEquals(headline.tags, ["work", "urgent"]);

    // Title parsed into inlines
    assertEquals(headline.title, [
        { type: "text", value: "Urgent task with " },
        { type: "bold", children: [{ type: "text", value: "bold" }] },
    ]);

    // Planning info
    assertExists(headline.planning);
    assertEquals(headline.planning.deadline, "<2026-09-10 Thu>");
    assertEquals(headline.planning.scheduled, "<2026-09-08 Tue>");
    assertEquals(headline.planning.closed, "[2026-09-08 Tue 12:00]");

    // Description paragraph
    assertEquals(headline.children.length, 1);
    assertEquals(headline.children[0].type, "paragraph");
});

Deno.test("parseOrgBlocks: Headline property drawers (:PROPERTIES: ... :END:)", () => {
    const input = [
        "* Configured Headline",
        ":PROPERTIES:",
        ":CUSTOM_ID: headline-1",
        ":CATEGORY: development",
        ":END:",
        "Headline body text.",
    ].join("\n");

    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;

    // Properties attached directly to headline
    assertEquals(headline.properties?.CUSTOM_ID, "headline-1");
    assertEquals(headline.properties?.CATEGORY, "development");

    // Also present as property_drawer element in children
    assertEquals(headline.children.length, 2);
    const drawer = headline.children[0] as OrgPropertyDrawerElement;
    assertEquals(drawer.type, "property_drawer");
    assertEquals(drawer.properties.CUSTOM_ID, "headline-1");
    assertEquals(drawer.children.length, 2);
    assertEquals(drawer.children[0], {
        type: "node_property",
        key: "CUSTOM_ID",
        value: "headline-1",
    });
});

Deno.test("parseOrgBlocks: Pipe tables with separator rules, alignments, and lenient normalization", () => {
    const input = [
        "#+NAME: users_table",
        "#+CAPTION: Active user list",
        "| ID | Name | Role |",
        "|----+------+------|",
        "| 1  | Alice | Admin |",
        "| 2  | Bob   |", // Missing trailing cell and pipe - should auto-normalize
    ].join("\n");

    const doc = parseOrgDocument(input);
    assertEquals(doc.children.length, 1);

    const table = doc.children[0] as OrgTableElement;
    assertEquals(table.type, "table");
    assertEquals(table.name, "users_table");
    assertExists(table.caption);

    assertEquals(table.rows.length, 4);

    // Row 0: Header data
    assertEquals(table.rows[0].isRule, false);
    assertEquals(table.rows[0].cells.length, 3);
    assertEquals(table.rows[0].cells[0].children, [{ type: "text", value: "ID" }]);
    assertEquals(table.rows[0].cells[1].children, [{ type: "text", value: "Name" }]);
    assertEquals(table.rows[0].cells[2].children, [{ type: "text", value: "Role" }]);

    // Row 1: Separator rule
    assertEquals(table.rows[1].isRule, true);

    // Row 2: Data row
    assertEquals(table.rows[2].isRule, false);
    assertEquals(table.rows[2].cells[1].children, [{ type: "text", value: "Alice" }]);

    // Row 3: Leniently padded row to match 3 columns
    assertEquals(table.rows[3].isRule, false);
    assertEquals(table.rows[3].cells.length, 3);
    assertEquals(table.rows[3].cells[0].children, [{ type: "text", value: "2" }]);
    assertEquals(table.rows[3].cells[1].children, [{ type: "text", value: "Bob" }]);
    assertEquals(table.rows[3].cells[2].children, []); // Empty padded cell
});

Deno.test("parseOrgBlocks: Lists with checkboxes, cookies, description items, and nesting", () => {
    const input = [
        "- [X] [2/2] Completed task",
        "- [ ] Open task",
        "- Term 1 :: Definition of term 1",
        "  - Nested subitem",
        "1. First ordered",
        "2. Second ordered",
    ].join("\n");

    const doc = parseOrgDocument(input);
    assertEquals(doc.children.length, 2); // Unordered list followed by ordered list

    const uList = doc.children[0] as OrgListElement;
    assertEquals(uList.type, "list");
    assertEquals(uList.ordered, false);
    assertEquals(uList.children.length, 3);

    // Item 0: Checked with cookie
    const item0 = uList.children[0];
    assertEquals(item0.checked, true);
    assertEquals(item0.counterCookie, "[2/2]");
    assertEquals(item0.children[0], { type: "text", value: "Completed task" });

    // Item 1: Unchecked
    const item1 = uList.children[1];
    assertEquals(item1.checked, false);
    assertEquals(item1.children[0], { type: "text", value: "Open task" });

    // Item 2: Description item with nested list
    const item2 = uList.children[2];
    assertEquals(item2.tag, [{ type: "text", value: "Term 1" }]);
    assertEquals(item2.children[0], { type: "text", value: "Definition of term 1" });

    // Nested list inside item 2
    const nestedList = item2.children[1] as OrgListElement;
    assertEquals(nestedList.type, "list");
    assertEquals(nestedList.children.length, 1);
    assertEquals(nestedList.children[0].children[0], { type: "text", value: "Nested subitem" });

    // Ordered list
    const oList = doc.children[1] as OrgListElement;
    assertEquals(oList.type, "list");
    assertEquals(oList.ordered, true);
    assertEquals(oList.children.length, 2);
});

Deno.test("parseOrgBlocks: Fixed-width, horizontal rules, and comments", () => {
    const input = [
        "# This is an Org comment",
        ": fixed-width line 1",
        ": fixed-width line 2",
        "-----",
        "Paragraph after rule.",
    ].join("\n");

    const doc = parseOrgDocument(input);
    assertEquals(doc.children.length, 4);

    assertEquals(doc.children[0], {
        type: "comment",
        value: "This is an Org comment",
    });

    assertEquals(doc.children[1], {
        type: "fixed_width",
        value: "fixed-width line 1\nfixed-width line 2",
    });

    assertEquals(doc.children[2], {
        type: "horizontal_rule",
    });

    const para = doc.children[3] as OrgParagraphElement;
    assertEquals(para.type, "paragraph");
    assertEquals(para.children[0], {
        type: "text",
        value: "Paragraph after rule.",
    });
});

Deno.test("parseOrgBlocks: LaTeX environments and standalone display math blocks", () => {
    const input = [
        "\\begin{equation}",
        "E = mc^2",
        "\\end{equation}",
        "",
        "$$",
        "\\int_{-\\infty}^\\infty e^{-x^2} dx = \\sqrt{\\pi}",
        "$$",
        "",
        "$$\\text{Single-line double dollar}$$",
        "",
        "\\[",
        "\\sum_{k=1}^n k = \\frac{n(n+1)}{2}",
        "\\]",
    ].join("\n");

    const doc = parseOrgDocument(input);
    assertEquals(doc.children.length, 4);

    const env0 = doc.children[0] as OrgLatexEnvironmentElement;
    assertEquals(env0.type, "latex_environment");
    assertEquals(env0.value, "\\begin{equation}\nE = mc^2\n\\end{equation}");

    const env1 = doc.children[1] as OrgLatexEnvironmentElement;
    assertEquals(env1.type, "latex_environment");
    assertEquals(env1.value.includes("\\sqrt{\\pi}"), true);

    const env2 = doc.children[2] as OrgLatexEnvironmentElement;
    assertEquals(env2.type, "latex_environment");
    assertEquals(env2.value, "$$\\text{Single-line double dollar}$$");

    const env3 = doc.children[3] as OrgLatexEnvironmentElement;
    assertEquals(env3.type, "latex_environment");
    assertEquals(env3.value.includes("\\sum_{k=1}^n"), true);
});
