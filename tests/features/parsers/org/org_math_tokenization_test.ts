import { assertEquals } from "@std/assert";
import { parseOrgInline } from "@internal/features/parsers/org";
import type { OrgLatexFragmentObject, OrgTextObject } from "@internal/features/parsers/org";

Deno.test("unit: OrgMathTokenizer: isolates inline dollar math token before entity expansion", () => {
    const text = "Expression $E = mc^2$ in physics.";
    const nodes = parseOrgInline(text);
    const mathNode = nodes.find((n): n is OrgLatexFragmentObject => n.type === "latex_fragment");
    assertEquals(mathNode?.value, "$E = mc^2$");
});

Deno.test("unit: OrgMathTokenizer: delivers shielded math fragments to AST verbatim", () => {
    const text = "Let formula be $\\lambda = \\frac{h}{p}$ for momentum.";
    const nodes = parseOrgInline(text);
    const mathNode = nodes.find((n): n is OrgLatexFragmentObject => n.type === "latex_fragment");
    assertEquals(mathNode?.value, "$\\lambda = \\frac{h}{p}$");
});

Deno.test("unit: OrgMathTokenizer: preserves LaTeX backslash commands in display equation blocks", () => {
    const text = "Display:\n\\begin{equation}\\lambda = \\alpha + \\beta\\end{equation}";
    const nodes = parseOrgInline(text);
    const mathNode = nodes.find((n): n is OrgLatexFragmentObject => n.type === "latex_fragment");
    assertEquals(mathNode?.value, "\\begin{equation}\\lambda = \\alpha + \\beta\\end{equation}");
});

Deno.test("unit: OrgMathTokenizer: flags display math fragment with isDisplay true", () => {
    const text = "Display:\n$$ \\int_0^\\infty e^{-x} dx = 1 $$";
    const nodes = parseOrgInline(text);
    const mathNode = nodes.find((n): n is OrgLatexFragmentObject => n.type === "latex_fragment");
    assertEquals(mathNode?.isDisplay, true);
});

Deno.test("unit: OrgMathTokenizer: preserves parenthesis delimited inline math fragment", () => {
    const text = "Sum \\( a + b = c \\) inline.";
    const nodes = parseOrgInline(text);
    const mathNode = nodes.find((n): n is OrgLatexFragmentObject => n.type === "latex_fragment");
    assertEquals(mathNode?.value, "\\( a + b = c \\)");
});

Deno.test("unit: OrgMathTokenizer: ignores currency formatted text as non-math prose", () => {
    const text = "Total is $100 and $200 today.";
    const nodes = parseOrgInline(text);
    const hasMath = nodes.some((n) => n.type === "latex_fragment");
    assertEquals(hasMath, false);
});
