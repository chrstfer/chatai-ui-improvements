import { assertEquals } from "@std/assert";
import {
    serializeOrgElement,
    serializeOrgObjects,
    serializeOrgSubtree,
} from "../../../src/languages/org/ast/serializer.ts";
import { parseOrgDocument } from "../../../src/languages/org/ast/parser.ts";
import type { OrgHeadlineElement, OrgParagraphElement } from "../../../src/languages/org/ast/types.ts";

Deno.test("unit: serializeOrgObjects round-trips inline formatting and links to raw string", () => {
    const raw = "Sample with *bold*, /italic/, ~code~, [[https://example.com][link]], and $E = mc^2$.";
    const doc = parseOrgDocument(raw);
    const para = doc.children[0] as OrgParagraphElement;
    const serialized = serializeOrgObjects(para.children);
    assertEquals(serialized, raw);
});

Deno.test("unit: serializeOrgElement serializes source code blocks with language hint", () => {
    const raw = "#+BEGIN_SRC python\ndef hello():\n    return 42\n#+END_SRC";
    const doc = parseOrgDocument(raw);
    const blockStr = serializeOrgElement(doc.children[0]);
    assertEquals(blockStr.toLowerCase().includes("#+begin_src python"), true);
});

Deno.test("unit: serializeOrgElement preserves code block body content", () => {
    const raw = "#+BEGIN_SRC python\ndef hello():\n    return 42\n#+END_SRC";
    const doc = parseOrgDocument(raw);
    const blockStr = serializeOrgElement(doc.children[0]);
    assertEquals(blockStr.includes("return 42"), true);
});

Deno.test("unit: serializeOrgElement serializes pipe tables", () => {
    const raw = "| ID | Name |\n|---|---|\n| 1 | Alice |";
    const doc = parseOrgDocument(raw);
    const tableStr = serializeOrgElement(doc.children[0]);
    assertEquals(tableStr.includes("| ID | Name |"), true);
});

Deno.test("unit: serializeOrgElement serializes list checkbox items", () => {
    const raw = "- [X] Done task\n- [ ] Open task";
    const doc = parseOrgDocument(raw);
    const listStr = serializeOrgElement(doc.children[0]);
    assertEquals(listStr.includes("- [X] Done task"), true);
});

Deno.test("unit: serializeOrgSubtree preserves headline title, todo, priority, and tags", () => {
    const raw = "* TODO [#A] Deploy Pipeline :dev:ops:\nContent here.";
    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;
    const serialized = serializeOrgSubtree(headline);
    assertEquals(serialized.includes("* TODO [#A] Deploy Pipeline :dev:ops:"), true);
});

Deno.test("unit: serializeOrgSubtree preserves planning line", () => {
    const raw = "* Task\nDEADLINE: <2026-09-10 Thu>\nContent.";
    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;
    const serialized = serializeOrgSubtree(headline);
    assertEquals(serialized.includes("DEADLINE: <2026-09-10 Thu>"), true);
});

Deno.test("unit: serializeOrgSubtree preserves property drawer entries", () => {
    const raw = "* Task\n:PROPERTIES:\n:OWNER: agent\n:END:\nContent.";
    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;
    const serialized = serializeOrgSubtree(headline);
    assertEquals(serialized.includes(":OWNER: agent"), true);
});

Deno.test("unit: serializeOrgSubtree preserves headline body text", () => {
    const raw = "* Task\nExecute automated deployment scripts.";
    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;
    const serialized = serializeOrgSubtree(headline);
    assertEquals(serialized.includes("Execute automated deployment scripts."), true);
});

Deno.test("unit: serializeOrgSubtree recursively includes child headlines", () => {
    const raw = "* Parent Task\n** Child Task\nChild content.";
    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;
    const serialized = serializeOrgSubtree(headline);
    assertEquals(serialized.includes("** Child Task"), true);
});

Deno.test("unit: serializeOrgSubtree honors dynamic todoOverrides", () => {
    const raw = "* TODO Top Task\nSome body text.";
    const doc = parseOrgDocument(raw);
    const headline = doc.children[0] as OrgHeadlineElement;
    const serialized = serializeOrgSubtree(headline, { "h-0": "DONE" }, "h-0");
    assertEquals(serialized.startsWith("* DONE Top Task"), true);
});
