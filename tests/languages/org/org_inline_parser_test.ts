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

Deno.test("parseOrgInline: Plain text produces single text object", () => {
    const nodes = parseOrgInline("Hello, this is pure text.");
    assertEquals(nodes.length, 1);
    assertEquals(nodes[0].type, "text");
    assertEquals((nodes[0] as OrgTextObject).value, "Hello, this is pure text.");
});

Deno.test("parseOrgInline: Standard emphasis markers (*bold*, /italic/, _underline_, +strike+)", () => {
    const boldNodes = parseOrgInline("This is *bold text* here.");
    assertEquals(boldNodes.length, 3);
    assertEquals(boldNodes[0].type, "text");
    assertEquals(boldNodes[1].type, "bold");
    const boldInner = (boldNodes[1] as OrgBoldObject).children;
    assertEquals(boldInner.length, 1);
    assertEquals((boldInner[0] as OrgTextObject).value, "bold text");

    const italicNodes = parseOrgInline("Look at /slanted italic/!");
    assertEquals(italicNodes.length, 3);
    assertEquals(italicNodes[1].type, "italic");
    assertEquals(((italicNodes[1] as OrgItalicObject).children[0] as OrgTextObject).value, "slanted italic");

    const underlineNodes = parseOrgInline("Some _underlined text_ words.");
    assertEquals(underlineNodes[1].type, "underline");
    assertEquals(
        ((underlineNodes[1] as OrgUnderlineObject).children[0] as OrgTextObject).value,
        "underlined text",
    );

    const strikeNodes = parseOrgInline("This was +cancelled+ work.");
    assertEquals(strikeNodes[1].type, "strike");
    assertEquals(((strikeNodes[1] as OrgStrikeObject).children[0] as OrgTextObject).value, "cancelled");
});

Deno.test("parseOrgInline: Monospace leaf nodes (~code~ and =verbatim=) do not parse inner markup", () => {
    const codeNodes = parseOrgInline("Run ~const x = *not_bold*;~ in terminal.");
    assertEquals(codeNodes.length, 3);
    assertEquals(codeNodes[1].type, "code");
    assertEquals((codeNodes[1] as OrgCodeObject).value, "const x = *not_bold*;");

    const verbNodes = parseOrgInline("Check =/raw/ and *unparsed*= symbol.");
    assertEquals(verbNodes.length, 3);
    assertEquals(verbNodes[1].type, "verbatim");
    assertEquals((verbNodes[1] as OrgVerbatimObject).value, "/raw/ and *unparsed*");
});

Deno.test("parseOrgInline: Recursively parses nested emphasis markers", () => {
    const nested = parseOrgInline("A *bold with /italic/ inside* statement.");
    assertEquals(nested.length, 3);
    assertEquals(nested[1].type, "bold");
    const inner = (nested[1] as OrgBoldObject).children;
    assertEquals(inner.length, 3);
    assertEquals(inner[0].type, "text");
    assertEquals((inner[0] as OrgTextObject).value, "bold with ");
    assertEquals(inner[1].type, "italic");
    assertEquals(((inner[1] as OrgItalicObject).children[0] as OrgTextObject).value, "italic");
    assertEquals(inner[2].type, "text");
    assertEquals((inner[2] as OrgTextObject).value, " inside");
});

Deno.test("parseOrgInline: Links with descriptions and bare links", () => {
    const linkWithDesc = parseOrgInline("Visit [[https://orgmode.org][Org Mode *Home*]] today.");
    assertEquals(linkWithDesc.length, 3);
    assertEquals(linkWithDesc[1].type, "link");
    const linkObj = linkWithDesc[1] as OrgLinkObject;
    assertEquals(linkObj.url, "https://orgmode.org");
    assertEquals(linkObj.description?.length, 2);
    assertEquals(linkObj.description?.[0].type, "text");
    assertEquals(linkObj.description?.[1].type, "bold");

    const bareLink = parseOrgInline("See [[https://example.com/spec]].");
    assertEquals(bareLink.length, 3);
    assertEquals(bareLink[1].type, "link");
    assertEquals((bareLink[1] as OrgLinkObject).url, "https://example.com/spec");
    assertEquals((bareLink[1] as OrgLinkObject).description, undefined);
});

Deno.test("parseOrgInline: Macros with and without arguments", () => {
    const macroWithArgs = parseOrgInline("Value is {{{custom_macro(foo, bar)}}}.");
    assertEquals(macroWithArgs.length, 3);
    assertEquals(macroWithArgs[1].type, "macro");
    const m1 = macroWithArgs[1] as OrgMacroObject;
    assertEquals(m1.name, "custom_macro");
    assertEquals(m1.args, ["foo", "bar"]);
    assertEquals(m1.raw, "{{{custom_macro(foo, bar)}}}");

    const bareMacro = parseOrgInline("Title: {{{title}}}");
    assertEquals(bareMacro.length, 2);
    assertEquals(bareMacro[1].type, "macro");
    assertEquals((bareMacro[1] as OrgMacroObject).name, "title");
    assertEquals((bareMacro[1] as OrgMacroObject).args, []);
});

Deno.test("parseOrgInline: LaTeX Greek entities and math fragments", () => {
    const entityNodes = parseOrgInline("Calculate \\lambda and \\sigma values.");
    assertEquals(entityNodes.length, 5);
    assertEquals(entityNodes[1].type, "entity");
    assertEquals((entityNodes[1] as OrgEntityObject).name, "lambda");
    assertEquals(entityNodes[3].type, "entity");
    assertEquals((entityNodes[3] as OrgEntityObject).name, "sigma");

    const mathFragment = parseOrgInline("Euler formula: $e^{i\\pi} + 1 = 0$ is elegant.");
    assertEquals(mathFragment.length, 3);
    assertEquals(mathFragment[1].type, "latex_fragment");
    assertEquals((mathFragment[1] as OrgLatexFragmentObject).value, "$e^{i\\pi} + 1 = 0$");
    assertEquals((mathFragment[1] as OrgLatexFragmentObject).isDisplay, false);

    const displayDoubleDollar = parseOrgInline("Formula: $$\\sum_{i=1}^n x_i = S$$ is centered.");
    assertEquals(displayDoubleDollar.length, 3);
    assertEquals(displayDoubleDollar[1].type, "latex_fragment");
    assertEquals((displayDoubleDollar[1] as OrgLatexFragmentObject).value, "$$\\sum_{i=1}^n x_i = S$$");
    assertEquals((displayDoubleDollar[1] as OrgLatexFragmentObject).isDisplay, true);

    const displayBracket = parseOrgInline("Equation: \\[\\int_0^1 f(x)dx\\] is definite.");
    assertEquals(displayBracket.length, 3);
    assertEquals(displayBracket[1].type, "latex_fragment");
    assertEquals((displayBracket[1] as OrgLatexFragmentObject).value, "\\[\\int_0^1 f(x)dx\\]");
    assertEquals((displayBracket[1] as OrgLatexFragmentObject).isDisplay, true);

    // Titan snippet scenario: inline math followed by display math inside text
    const titanSnippet =
        "reacts it with ambient $CH_4$:\n  $$\\text{CH}_4 + \\text{H}_2\\text{O} \\longrightarrow \\text{CO} + 3\\text{H}_2$$\n  produces synthesis gas.";
    const titanNodes = parseOrgInline(titanSnippet);
    assertEquals(
        titanNodes.some((n) => n.type === "latex_fragment" && (n as OrgLatexFragmentObject).isDisplay === true),
        true,
    );
    assertEquals(
        titanNodes.some((n) => n.type === "text" && (n as { value: string }).value.includes("produces synthesis gas")),
        true,
    );
});

Deno.test("parseOrgInline: Statistics cookies", () => {
    const fractionCookie = parseOrgInline("Task group [2/5] complete.");
    assertEquals(fractionCookie.length, 3);
    assertEquals(fractionCookie[1].type, "statistics_cookie");
    const c1 = fractionCookie[1] as OrgStatisticsCookieObject;
    assertEquals(c1.current, 2);
    assertEquals(c1.total, 5);
    assertEquals(c1.percent, 40);

    const percentCookie = parseOrgInline("Progress is [75%].");
    assertEquals(percentCookie.length, 3);
    const c2 = percentCookie[1] as OrgStatisticsCookieObject;
    assertEquals(c2.percent, 75);
});

Deno.test("parseOrgInline: Forced line break (\\\\)", () => {
    const lineBreakNodes = parseOrgInline("First line\\\\\nSecond line");
    assertEquals(lineBreakNodes.length, 3);
    assertEquals(lineBreakNodes[0].type, "text");
    assertEquals(lineBreakNodes[1].type, "line_break");
    assertEquals(lineBreakNodes[2].type, "text");
});

Deno.test("parseOrgInline: Respects border constraints and avoids false positives", () => {
    // Arithmetic: 5 * 4 * 3 should not be bold
    const math = parseOrgInline("5 * 4 * 3 = 60");
    assertEquals(math.length, 1);
    assertEquals(math[0].type, "text");

    // Trailing/leading space inside delimiters should not match
    const spaceInner1 = parseOrgInline("* not bold*");
    assertEquals(spaceInner1.length, 1);
    assertEquals(spaceInner1[0].type, "text");

    const spaceInner2 = parseOrgInline("*not bold *");
    assertEquals(spaceInner2.length, 1);
    assertEquals(spaceInner2[0].type, "text");

    // Mid-word asterisks should not match
    const midWord = parseOrgInline("some*word*here");
    assertEquals(midWord.length, 1);
    assertEquals(midWord[0].type, "text");
});
