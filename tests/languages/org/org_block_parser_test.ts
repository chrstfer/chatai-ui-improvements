import { assertEquals } from "@std/assert";
import { parseOrgDocument } from "../../../src/languages/org/ast/parser.ts";
import type {
    OrgBlockElement,
    OrgDynamicBlockElement,
    OrgHeadlineElement,
    OrgKeywordElement,
    OrgLatexEnvironmentElement,
    OrgListElement,
    OrgPropertyDrawerElement,
    OrgTableElement,
} from "../../../src/languages/org/ast/types.ts";

Deno.test("unit: parseOrgBlocks extracts document title property", () => {
    const input = "#+TITLE: Disambiguation Test\n#+AUTHOR: DeepMind\n";
    const doc = parseOrgDocument(input);
    assertEquals(doc.title, "Disambiguation Test");
});

Deno.test("unit: parseOrgBlocks extracts author metadata property", () => {
    const input = "#+TITLE: Disambiguation Test\n#+AUTHOR: DeepMind\n";
    const doc = parseOrgDocument(input);
    assertEquals(doc.properties?.author, "DeepMind");
});

Deno.test("unit: parseOrgBlocks parses source block language parameter", () => {
    const input = "#+BEGIN_SRC python\ndef hello():\n    print('world')\n#+END_SRC";
    const doc = parseOrgDocument(input);
    const srcBlock = doc.children[0] as OrgBlockElement;
    assertEquals(srcBlock.language, "python");
});

Deno.test("unit: parseOrgBlocks parses source block body", () => {
    const input = "#+BEGIN_SRC python\ndef hello():\n    print('world')\n#+END_SRC";
    const doc = parseOrgDocument(input);
    const srcBlock = doc.children[0] as OrgBlockElement;
    assertEquals(srcBlock.value, "def hello():\n    print('world')");
});

Deno.test("unit: parseOrgBlocks parses quote block body", () => {
    const input = "#+BEGIN_QUOTE\nA famous quote.\n#+END_QUOTE";
    const doc = parseOrgDocument(input);
    const quoteBlock = doc.children[0] as OrgBlockElement;
    assertEquals(quoteBlock.value, "A famous quote.");
});

Deno.test("unit: parseOrgBlocks parses dynamic block name", () => {
    const input = "#+BEGIN: clocktable :maxlevel 2 :scope file\n| Headline | Time |\n#+END:";
    const doc = parseOrgDocument(input);
    const dyn = doc.children[0] as OrgDynamicBlockElement;
    assertEquals(dyn.name, "clocktable");
});

Deno.test("unit: parseOrgBlocks parses dynamic block arguments", () => {
    const input = "#+BEGIN: clocktable :maxlevel 2 :scope file\n| Headline | Time |\n#+END:";
    const doc = parseOrgDocument(input);
    const dyn = doc.children[0] as OrgDynamicBlockElement;
    assertEquals(dyn.arguments, ":maxlevel 2 :scope file");
});

Deno.test("unit: parseOrgBlocks scopes affiliated keywords to following element", () => {
    const input =
        "#+NAME: compute_fn\n#+CAPTION: A mathematical function\n#+BEGIN_SRC typescript\nexport function compute() {}\n#+END_SRC";
    const doc = parseOrgDocument(input);
    const block = doc.children[0] as OrgBlockElement;
    assertEquals(block.name, "compute_fn");
});

Deno.test("unit: parseOrgBlocks preserves detached keywords as standalone children", () => {
    const input = "#+NAME: detached_name\n\n#+BEGIN_SRC rust\nfn main() {}\n#+END_SRC";
    const doc = parseOrgDocument(input);
    const kw = doc.children[0] as OrgKeywordElement;
    assertEquals(kw.value.trim(), "detached_name");
});

Deno.test("unit: parseOrgBlocks nests headlines into hierarchical tree via level stack", () => {
    const input = "* Level 1 Heading\n** Level 2 Child\n*** Level 3 Grandchild\nDeep text.";
    const doc = parseOrgDocument(input);
    const h1 = doc.children[0] as OrgHeadlineElement;
    const h2 = h1.children[0] as OrgHeadlineElement;
    const h3 = h2.children[0] as OrgHeadlineElement;
    assertEquals(h3.level, 3);
});

Deno.test("unit: parseOrgBlocks parses sibling headlines at same level", () => {
    const input = "* Level 1 Heading\n* Sibling Level 1\nSibling text.";
    const doc = parseOrgDocument(input);
    const h1Sibling = doc.children[1] as OrgHeadlineElement;
    assertEquals(h1Sibling.level, 1);
});

Deno.test("unit: parseOrgBlocks parses headline TODO keyword", () => {
    const input = "* TODO [#A] Urgent task :work:urgent:\nTask description.";
    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.todoKeyword, "TODO");
});

Deno.test("unit: parseOrgBlocks parses headline priority cookie", () => {
    const input = "* TODO [#A] Urgent task :work:urgent:\nTask description.";
    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.priority, "A");
});

Deno.test("unit: parseOrgBlocks parses headline tags", () => {
    const input = "* TODO [#A] Urgent task :work:urgent:\nTask description.";
    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.tags, ["work", "urgent"]);
});

Deno.test("unit: parseOrgBlocks parses headline planning deadlines", () => {
    const input = "* Task\nDEADLINE: <2026-09-10 Thu>\nTask description.";
    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.planning?.deadline, "<2026-09-10 Thu>");
});

Deno.test("unit: parseOrgBlocks attaches property drawer values to headline properties", () => {
    const input = "* Configured Headline\n:PROPERTIES:\n:CUSTOM_ID: headline-1\n:END:\nHeadline text.";
    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.properties?.CUSTOM_ID, "headline-1");
});

Deno.test("unit: parseOrgBlocks preserves property drawer in headline children", () => {
    const input = "* Configured Headline\n:PROPERTIES:\n:CUSTOM_ID: headline-1\n:END:\nHeadline text.";
    const doc = parseOrgDocument(input);
    const headline = doc.children[0] as OrgHeadlineElement;
    const drawer = headline.children[0] as OrgPropertyDrawerElement;
    assertEquals(drawer.type, "property_drawer");
});

Deno.test("unit: parseOrgBlocks parses pipe table header rows", () => {
    const input = "| ID | Name |\n|----+------|\n| 1  | Alice |";
    const doc = parseOrgDocument(input);
    const table = doc.children[0] as OrgTableElement;
    assertEquals(table.rows[0].cells[0].children, [{ type: "text", value: "ID" }]);
});

Deno.test("unit: parseOrgBlocks parses pipe table separator rule", () => {
    const input = "| ID | Name |\n|----+------|\n| 1  | Alice |";
    const doc = parseOrgDocument(input);
    const table = doc.children[0] as OrgTableElement;
    assertEquals(table.rows[1].isRule, true);
});

Deno.test("unit: parseOrgBlocks leniently normalizes incomplete pipe table rows", () => {
    const input = "| ID | Name | Role |\n|----+------+------|\n| 2  | Bob   |";
    const doc = parseOrgDocument(input);
    const table = doc.children[0] as OrgTableElement;
    assertEquals(table.rows[2].cells.length, 3);
});

Deno.test("unit: parseOrgBlocks parses list checked state and counter cookie", () => {
    const input = "- [X] [2/2] Completed task\n- [ ] Open task";
    const doc = parseOrgDocument(input);
    const uList = doc.children[0] as OrgListElement;
    assertEquals(uList.children[0].checked, true);
});

Deno.test("unit: parseOrgBlocks parses list description terms", () => {
    const input = "- Term 1 :: Definition of term 1";
    const doc = parseOrgDocument(input);
    const uList = doc.children[0] as OrgListElement;
    assertEquals(uList.children[0].tag, [{ type: "text", value: "Term 1" }]);
});

Deno.test("unit: parseOrgBlocks parses nested sublists within list items", () => {
    const input = "- Parent item\n  - Nested subitem";
    const doc = parseOrgDocument(input);
    const uList = doc.children[0] as OrgListElement;
    const nestedList = uList.children[0].children[1] as OrgListElement;
    assertEquals(nestedList.type, "list");
});

Deno.test("unit: parseOrgBlocks parses ordered lists", () => {
    const input = "1. First ordered\n2. Second ordered";
    const doc = parseOrgDocument(input);
    const oList = doc.children[0] as OrgListElement;
    assertEquals(oList.ordered, true);
});

Deno.test("unit: parseOrgBlocks parses Org comment lines", () => {
    const input = "# This is an Org comment\nParagraph.";
    const doc = parseOrgDocument(input);
    assertEquals(doc.children[0].type, "comment");
});

Deno.test("unit: parseOrgBlocks parses fixed-width lines", () => {
    const input = ": fixed-width line 1\n: fixed-width line 2";
    const doc = parseOrgDocument(input);
    assertEquals(doc.children[0].type, "fixed_width");
});

Deno.test("unit: parseOrgBlocks parses horizontal rule elements", () => {
    const input = "-----\nParagraph.";
    const doc = parseOrgDocument(input);
    assertEquals(doc.children[0].type, "horizontal_rule");
});

Deno.test("unit: parseOrgBlocks parses LaTeX begin-end environments", () => {
    const input = "\\begin{equation}\nE = mc^2\n\\end{equation}";
    const doc = parseOrgDocument(input);
    const env = doc.children[0] as OrgLatexEnvironmentElement;
    assertEquals(env.type, "latex_environment");
});

Deno.test("unit: parseOrgBlocks parses multiline display dollar blocks", () => {
    const input = "$$\n\\int e^{-x^2} dx\n$$";
    const doc = parseOrgDocument(input);
    const env = doc.children[0] as OrgLatexEnvironmentElement;
    assertEquals(env.value.includes("\\int"), true);
});

Deno.test("unit: parseOrgBlocks parses single-line display dollar blocks", () => {
    const input = "$$\\text{Single-line double dollar}$$";
    const doc = parseOrgDocument(input);
    const env = doc.children[0] as OrgLatexEnvironmentElement;
    assertEquals(env.value, "$$\\text{Single-line double dollar}$$");
});

Deno.test("unit: parseOrgBlocks parses bracket display math blocks", () => {
    const input = "\\[\n\\sum_{k=1}^n k\n\\]";
    const doc = parseOrgDocument(input);
    const env = doc.children[0] as OrgLatexEnvironmentElement;
    assertEquals(env.value.includes("\\sum"), true);
});
