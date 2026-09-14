import { assertEquals } from "@std/assert";
import { parseMarkdownBlocks } from "@internal/features/parsers/markdown";
import type {
    MarkdownCodeBlockNode,
    MarkdownHeadingNode,
    MarkdownListNode,
    MarkdownMathDisplayBlockNode,
    MarkdownParagraphNode,
    MarkdownSectionNode,
    MarkdownThematicBreakNode,
} from "@internal/features/parsers/markdown";

Deno.test("unit: MarkdownBlockParser: constructs heading node with depth and slug", () => {
    const md = "# Getting Started\nProse text.";
    const blocks = parseMarkdownBlocks(md);
    const section = blocks[0] as MarkdownSectionNode;
    assertEquals(section.heading.slug, "getting-started");
});

Deno.test("unit: MarkdownBlockParser: sets depth on heading node", () => {
    const md = "# Getting Started\nProse text.";
    const blocks = parseMarkdownBlocks(md);
    const section = blocks[0] as MarkdownSectionNode;
    assertEquals(section.heading.depth, 1);
});

Deno.test("unit: MarkdownBlockParser: nests subordinate H2 heading inside H1 section node", () => {
    const md = "# Main Section\nIntroduction.\n## Sub Section\nDetails.";
    const blocks = parseMarkdownBlocks(md);
    const h1Section = blocks[0] as MarkdownSectionNode;
    const h2Section = h1Section.children.find((b): b is MarkdownSectionNode => b.type === "section");
    assertEquals(h2Section?.heading.depth, 2);
});

Deno.test("unit: MarkdownBlockParser: nests paragraphs under appropriate section heading", () => {
    const md = "# Title\nPara one.\n## Subtitle\nPara two.";
    const blocks = parseMarkdownBlocks(md);
    const h1Section = blocks[0] as MarkdownSectionNode;
    const h2Section = h1Section.children.find((b): b is MarkdownSectionNode => b.type === "section");
    const h2Para = h2Section?.children.find((b): b is MarkdownParagraphNode => b.type === "paragraph");
    assertEquals(h2Para?.type, "paragraph");
});

Deno.test("unit: MarkdownBlockParser: pragmatically nests H3 under H1 when H2 is skipped", () => {
    const md = "# Top Level\nContent.\n### Deep Level\nDetails.";
    const blocks = parseMarkdownBlocks(md);
    const h1Section = blocks[0] as MarkdownSectionNode;
    const h3Section = h1Section.children.find((b): b is MarkdownSectionNode => b.type === "section");
    assertEquals(h3Section?.heading.depth, 3);
});

Deno.test("unit: MarkdownBlockParser: parses fenced code block capturing language and code", () => {
    const md = "```typescript\nconst x = 42;\n```";
    const blocks = parseMarkdownBlocks(md);
    const codeBlock = blocks[0] as MarkdownCodeBlockNode;
    assertEquals(codeBlock.lang, "typescript");
});

Deno.test("unit: MarkdownBlockParser: captures fenceChar and fenceLength on fenced code block", () => {
    const md = "````python\nprint('hello')\n````";
    const blocks = parseMarkdownBlocks(md);
    const codeBlock = blocks[0] as MarkdownCodeBlockNode;
    assertEquals(codeBlock.fenceLength, 4);
});

Deno.test("unit: MarkdownBlockParser: parses tilde fenced code block", () => {
    const md = "~~~yaml\nkey: value\n~~~";
    const blocks = parseMarkdownBlocks(md);
    const codeBlock = blocks[0] as MarkdownCodeBlockNode;
    assertEquals(codeBlock.fenceChar, "~");
});

Deno.test("unit: MarkdownBlockParser: parses task list item with checked boolean", () => {
    const md = "- [x] Finished task";
    const blocks = parseMarkdownBlocks(md);
    const list = blocks[0] as MarkdownListNode;
    assertEquals(list.items[0].checked, true);
});

Deno.test("unit: MarkdownBlockParser: parses task list item with unchecked boolean", () => {
    const md = "- [ ] Pending task";
    const blocks = parseMarkdownBlocks(md);
    const list = blocks[0] as MarkdownListNode;
    assertEquals(list.items[0].checked, false);
});

Deno.test("unit: MarkdownBlockParser: parses thematic break horizontal rule", () => {
    const md = "Above\n\n---\n\nBelow";
    const blocks = parseMarkdownBlocks(md);
    const rule = blocks.find((b): b is MarkdownThematicBreakNode => b.type === "thematic_break");
    assertEquals(rule?.type, "thematic_break");
});

Deno.test("unit: MarkdownBlockParser: parses display double-dollar math block", () => {
    const md = "$$\n\\int_0^\\infty e^{-x} dx = 1\n$$";
    const blocks = parseMarkdownBlocks(md);
    const math = blocks.find((b): b is MarkdownMathDisplayBlockNode => b.type === "math_display");
    assertEquals(math?.delimiter, "$$");
});

Deno.test("unit: MarkdownBlockParser: parses display equation environment block", () => {
    const md = "\\begin{equation}\n\\lambda = \\frac{h}{p}\n\\end{equation}";
    const blocks = parseMarkdownBlocks(md);
    const math = blocks.find((b): b is MarkdownMathDisplayBlockNode => b.type === "math_display");
    assertEquals(math?.delimiter, "equation");
});
