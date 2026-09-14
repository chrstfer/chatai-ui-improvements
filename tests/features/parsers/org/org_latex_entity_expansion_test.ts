import { assertEquals } from "@std/assert";
import { parseOrgInline } from "../../../../src/features/parsers/org/inlineParser.ts";
import type { OrgEntityObject, OrgLatexFragmentObject } from "../../../../src/features/parsers/org/types.ts";

Deno.test("unit: OrgEntityExpander: expands Greek entities in prose while leaving shielded math untouched", () => {
    const text = "Let \\alpha be the parameter in $\\alpha + \\beta = 1$.";
    const nodes = parseOrgInline(text);
    const proseEntity = nodes.find((n): n is OrgEntityObject => n.type === "entity");
    assertEquals(proseEntity?.name, "alpha");
});

Deno.test("unit: OrgEntityExpander: leaves LaTeX backslash commands inside math span unexpanded", () => {
    const text = "Let \\alpha be the parameter in $\\alpha + \\beta = 1$.";
    const nodes = parseOrgInline(text);
    const mathSpan = nodes.find((n): n is OrgLatexFragmentObject => n.type === "latex_fragment");
    assertEquals(mathSpan?.value, "$\\alpha + \\beta = 1$");
});

Deno.test("unit: OrgEntityExpander: parses isolated Greek entity in prose", () => {
    const text = "Angle \\theta and constant \\pi are used.";
    const nodes = parseOrgInline(text);
    const entities = nodes.filter((n): n is OrgEntityObject => n.type === "entity");
    assertEquals(entities.map((e) => e.name), ["theta", "pi"]);
});

Deno.test("unit: OrgEntityExpander: preserves entity name and raw LaTeX in entity node", () => {
    const text = "Wavelength \\lambda is fundamental.";
    const nodes = parseOrgInline(text);
    const entity = nodes.find((n): n is OrgEntityObject => n.type === "entity");
    assertEquals(entity?.latex, "\\lambda");
});
