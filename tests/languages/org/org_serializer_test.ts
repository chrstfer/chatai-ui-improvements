import { assertEquals } from "@std/assert";
import {
    serializeOrgElement,
    serializeOrgObjects,
    serializeOrgSubtree,
} from "../../../src/languages/org/ast/serializer.ts";
import { parseOrgDocument } from "../../../src/languages/org/ast/parser.ts";
import type { OrgHeadlineElement, OrgParagraphElement } from "../../../src/languages/org/ast/types.ts";

Deno.test("serializeOrgObjects: Serializes inline formatting, links, and LaTeX math", () => {
    const raw = "Sample with *bold*, /italic/, ~code~, [[https://example.com][link]], and $E = mc^2$.";
    const doc = parseOrgDocument(raw);
    const para = doc.children[0] as OrgParagraphElement;
    assertEquals(para.type, "paragraph");

    const serialized = serializeOrgObjects(para.children);
    assertEquals(serialized, raw);
});

Deno.test("serializeOrgElement: Serializes code blocks, tables, lists, and comments", () => {
    const raw = [
        "#+NAME: test_block",
        "#+BEGIN_SRC python",
        "def hello():",
        "    return 42",
        "#+END_SRC",
        "",
        "| ID | Name |",
        "|---|",
        "| 1 | Alice |",
        "",
        "- [X] Done task",
        "- [ ] Open task",
    ].join("\n");

    const doc = parseOrgDocument(raw);
    assertEquals(doc.children.length, 3);

    const blockStr = serializeOrgElement(doc.children[0]);
    assertEquals(blockStr.toLowerCase().includes("#+begin_src python"), true);
    assertEquals(blockStr.includes("return 42"), true);

    const tableStr = serializeOrgElement(doc.children[1]);
    assertEquals(tableStr.includes("| ID | Name |"), true);

    const listStr = serializeOrgElement(doc.children[2]);
    assertEquals(listStr.includes("- [X] Done task"), true);
    assertEquals(listStr.includes("- [ ] Open task"), true);
});

Deno.test("serializeOrgSubtree: Serializes headline, planning, drawers, and child headlines", () => {
    const raw = [
        "* TODO [#A] Deploy Pipeline :dev:ops:",
        "DEADLINE: <2026-09-10 Thu>",
        ":PROPERTIES:",
        ":OWNER: agent",
        ":END:",
        "Execute automated deployment scripts.",
        "** Child Task",
        "Child content here.",
    ].join("\n");

    const doc = parseOrgDocument(raw);
    assertEquals(doc.children.length, 1);
    const headline = doc.children[0] as OrgHeadlineElement;
    assertEquals(headline.type, "headline");

    const serialized = serializeOrgSubtree(headline);
    assertEquals(serialized.includes("* TODO [#A] Deploy Pipeline :dev:ops:"), true);
    assertEquals(serialized.includes("DEADLINE: <2026-09-10 Thu>"), true);
    assertEquals(serialized.includes(":OWNER: agent"), true);
    assertEquals(serialized.includes("Execute automated deployment scripts."), true);
    assertEquals(serialized.includes("** Child Task"), true);
    assertEquals(serialized.includes("Child content here."), true);
});

Deno.test("serializeOrgSubtree: Honors dynamic todoOverrides", () => {
    const raw = [
        "* TODO Top Task",
        "Some body text.",
    ].join("\n");

    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;

    // With todo override: h-0 -> DONE
    const serialized = serializeOrgSubtree(headline, { "h-0": "DONE" }, "h-0");
    assertEquals(serialized.startsWith("* DONE Top Task"), true);
});
