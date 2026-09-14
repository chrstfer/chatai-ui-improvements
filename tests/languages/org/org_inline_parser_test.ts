import { assertEquals } from "@std/assert";
import { parseOrgInline } from "../../../src/languages/org/ast/inlineParser.ts";
import type {
    OrgBoldObject,
    OrgCodeObject,
    OrgEntityObject,
    OrgItalicObject,
    OrgLatexFragmentObject,
    OrgLinkObject,
    OrgMacroObject,
    OrgStatisticsCookieObject,
    OrgStrikeObject,
    OrgTextObject,
    OrgUnderlineObject,
    OrgVerbatimObject,
} from "../../../src/languages/org/ast/types.ts";

Deno.test("unit: OrgInlineParser: parseOrgInline creates single text object for plain text", () => {
    const nodes = parseOrgInline("Hello, this is pure text.");
    assertEquals((nodes[0] as OrgTextObject).value, "Hello, this is pure text.");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses bold emphasis delimiters", () => {
    const nodes = parseOrgInline("This is *bold text* here.");
    const boldInner = (nodes[1] as OrgBoldObject).children;
    assertEquals((boldInner[0] as OrgTextObject).value, "bold text");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses italic emphasis delimiters", () => {
    const nodes = parseOrgInline("Look at /slanted italic/!");
    const inner = (nodes[1] as OrgItalicObject).children[0] as OrgTextObject;
    assertEquals(inner.value, "slanted italic");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses underline emphasis delimiters", () => {
    const nodes = parseOrgInline("Some _underlined text_ words.");
    const inner = (nodes[1] as OrgUnderlineObject).children[0] as OrgTextObject;
    assertEquals(inner.value, "underlined text");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses strike emphasis delimiters", () => {
    const nodes = parseOrgInline("This was +cancelled+ work.");
    const inner = (nodes[1] as OrgStrikeObject).children[0] as OrgTextObject;
    assertEquals(inner.value, "cancelled");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses code monospace leaf node without inner markup", () => {
    const nodes = parseOrgInline("Run ~const x = *not_bold*;~ in terminal.");
    assertEquals((nodes[1] as OrgCodeObject).value, "const x = *not_bold*;");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses verbatim monospace leaf node without inner markup", () => {
    const nodes = parseOrgInline("Check =/raw/ and *unparsed*= symbol.");
    assertEquals((nodes[1] as OrgVerbatimObject).value, "/raw/ and *unparsed*");
});

Deno.test("unit: OrgInlineParser: parseOrgInline recursively parses nested emphasis markers", () => {
    const nodes = parseOrgInline("A *bold with /italic/ inside* statement.");
    const inner = (nodes[1] as OrgBoldObject).children;
    assertEquals(inner[1].type, "italic");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses link with description", () => {
    const nodes = parseOrgInline("Visit [[https://orgmode.org][Org Mode *Home*]] today.");
    const linkObj = nodes[1] as OrgLinkObject;
    assertEquals(linkObj.url, "https://orgmode.org");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses bare link without description", () => {
    const nodes = parseOrgInline("See [[https://example.com/spec]].");
    const linkObj = nodes[1] as OrgLinkObject;
    assertEquals(linkObj.description, undefined);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses macro with arguments", () => {
    const nodes = parseOrgInline("Value is {{{custom_macro(foo, bar)}}}.");
    const m1 = nodes[1] as OrgMacroObject;
    assertEquals(m1.args, ["foo", "bar"]);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses bare macro without arguments", () => {
    const nodes = parseOrgInline("Title: {{{title}}}");
    const m1 = nodes[1] as OrgMacroObject;
    assertEquals(m1.name, "title");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses LaTeX Greek entity", () => {
    const nodes = parseOrgInline("Calculate \\lambda and \\sigma values.");
    assertEquals((nodes[1] as OrgEntityObject).name, "lambda");
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses inline single-dollar LaTeX fragment", () => {
    const nodes = parseOrgInline("Euler formula: $e^{i\\pi} + 1 = 0$ is elegant.");
    const math = nodes[1] as OrgLatexFragmentObject;
    assertEquals(math.isDisplay, false);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses display double-dollar LaTeX fragment", () => {
    const nodes = parseOrgInline("Formula: $$\\sum_{i=1}^n x_i = S$$ is centered.");
    const math = nodes[1] as OrgLatexFragmentObject;
    assertEquals(math.isDisplay, true);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses display bracket LaTeX fragment", () => {
    const nodes = parseOrgInline("Equation: \\[\\int_0^1 f(x)dx\\] is definite.");
    const math = nodes[1] as OrgLatexFragmentObject;
    assertEquals(math.isDisplay, true);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses fraction statistics cookie", () => {
    const nodes = parseOrgInline("Task group [2/5] complete.");
    const cookie = nodes[1] as OrgStatisticsCookieObject;
    assertEquals(cookie.percent, 40);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses percent statistics cookie", () => {
    const nodes = parseOrgInline("Progress is [75%].");
    const cookie = nodes[1] as OrgStatisticsCookieObject;
    assertEquals(cookie.percent, 75);
});

Deno.test("unit: OrgInlineParser: parseOrgInline parses forced line break", () => {
    const nodes = parseOrgInline("First line\\\\\nSecond line");
    assertEquals(nodes[1].type, "line_break");
});

Deno.test("unit: OrgInlineParser: parseOrgInline does not treat arithmetic multiplication asterisks as bold", () => {
    const nodes = parseOrgInline("5 * 4 * 3 = 60");
    assertEquals(nodes.length, 1);
});

Deno.test("unit: OrgInlineParser: parseOrgInline rejects emphasis delimiters with leading inner whitespace", () => {
    const nodes = parseOrgInline("* not bold*");
    assertEquals(nodes.length, 1);
});

Deno.test("unit: OrgInlineParser: parseOrgInline rejects emphasis delimiters with trailing inner whitespace", () => {
    const nodes = parseOrgInline("*not bold *");
    assertEquals(nodes.length, 1);
});

Deno.test("unit: OrgInlineParser: parseOrgInline rejects mid-word asterisks", () => {
    const nodes = parseOrgInline("some*word*here");
    assertEquals(nodes.length, 1);
});
