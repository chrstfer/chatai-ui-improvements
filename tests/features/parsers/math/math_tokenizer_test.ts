import { assertEquals } from "@std/assert";
import { type MathSpanSlice, type ProseSlice, tokenizeMathSpans } from "../../../../src/features/parsers/math/index.ts";

Deno.test("unit: MathTokenizer: isolates inline dollar math token", () => {
    const text = "Formula $E = mc^2$ in relativity.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "E = mc^2");
});

Deno.test("unit: MathTokenizer: preserves raw delimiters for inline dollar math", () => {
    const text = "Formula $E = mc^2$ in relativity.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.raw, "$E = mc^2$");
});

Deno.test("unit: MathTokenizer: flags inline dollar math as non-display", () => {
    const text = "Formula $E = mc^2$ in relativity.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.isDisplay, false);
});

Deno.test("unit: MathTokenizer: isolates inline parenthesis math token", () => {
    const text = "Summing \\( \\alpha + \\beta = \\gamma \\) yields result.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "\\alpha + \\beta = \\gamma");
});

Deno.test("unit: MathTokenizer: isolates display double-dollar math block", () => {
    const text = "Integral:\n$$ \\int_0^\\infty e^{-x} dx = 1 $$\nDone.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "\\int_0^\\infty e^{-x} dx = 1");
});

Deno.test("unit: MathTokenizer: flags double-dollar math as display", () => {
    const text = "Integral:\n$$ \\int_0^\\infty e^{-x} dx = 1 $$\nDone.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.isDisplay, true);
});

Deno.test("unit: MathTokenizer: isolates display bracket math block", () => {
    const text = "Sum:\n\\[ \\sum_{i=1}^n i = \\frac{n(n+1)}{2} \\]\nEnd.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "\\sum_{i=1}^n i = \\frac{n(n+1)}{2}");
});

Deno.test("unit: MathTokenizer: isolates equation environment block", () => {
    const text = "Relation:\n\\begin{equation}\\lambda = \\frac{h}{p}\\end{equation}\nEnd.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "\\lambda = \\frac{h}{p}");
});

Deno.test("unit: MathTokenizer: isolates align environment block", () => {
    const text = "System:\n\\begin{align} a &= b \\\\ c &= d \\end{align}\nEnd.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "a &= b \\\\ c &= d");
});

Deno.test("unit: MathTokenizer: rejects currency values with digit lookahead", () => {
    const text = "The items cost $100 and $200 respectively.";
    const slices = tokenizeMathSpans(text);
    const hasMath = slices.some((s) => s.type === "math");
    assertEquals(hasMath, false);
});

Deno.test("unit: MathTokenizer: ignores escaped dollar signs", () => {
    const text = "Price is \\$50 for one or \\$90 for two.";
    const slices = tokenizeMathSpans(text);
    const hasMath = slices.some((s) => s.type === "math");
    assertEquals(hasMath, false);
});

Deno.test("unit: MathTokenizer: rejects unclosed single dollar delimiter", () => {
    const text = "This $unclosed dollar should not match math.";
    const slices = tokenizeMathSpans(text);
    const hasMath = slices.some((s) => s.type === "math");
    assertEquals(hasMath, false);
});

Deno.test("unit: MathTokenizer: emits preceding prose slice before math span", () => {
    const text = "Prefix text $x = 1$ suffix.";
    const slices = tokenizeMathSpans(text);
    const firstSlice = slices[0] as ProseSlice;
    assertEquals(firstSlice.text, "Prefix text ");
});

Deno.test("unit: MathTokenizer: emits succeeding prose slice after math span", () => {
    const text = "Prefix text $x = 1$ suffix.";
    const slices = tokenizeMathSpans(text);
    const lastSlice = slices[slices.length - 1] as ProseSlice;
    assertEquals(lastSlice.text, " suffix.");
});

Deno.test("unit: MathTokenizer: preserves pristine LaTeX commands in formula", () => {
    const text = "Relation $\\lambda = \\alpha + \\beta$ holds.";
    const slices = tokenizeMathSpans(text);
    const mathSlice = slices.find((s): s is MathSpanSlice => s.type === "math");
    assertEquals(mathSlice?.formula, "\\lambda = \\alpha + \\beta");
});
