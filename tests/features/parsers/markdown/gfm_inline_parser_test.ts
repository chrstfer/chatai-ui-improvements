import { assertEquals } from "@std/assert";
import { parseMarkdownInline } from "../../../../src/features/parsers/markdown/inlineParser.ts";
import type {
    MarkdownCodeSpanNode,
    MarkdownEmphasisNode,
    MarkdownImageNode,
    MarkdownLinkNode,
    MarkdownMathInlineNode,
    MarkdownTextNode,
} from "../../../../src/features/parsers/markdown/types.ts";

Deno.test("unit: MarkdownInlineParser: parses plain text as text node", () => {
    const nodes = parseMarkdownInline("Just simple prose text.");
    assertEquals((nodes[0] as MarkdownTextNode).value, "Just simple prose text.");
});

Deno.test("unit: MarkdownInlineParser: parses bold formatting with asterisks", () => {
    const nodes = parseMarkdownInline("A **bold word** here.");
    const boldNode = nodes.find((n): n is MarkdownEmphasisNode => n.type === "emphasis" && n.kind === "bold");
    assertEquals((boldNode?.children[0] as MarkdownTextNode).value, "bold word");
});

Deno.test("unit: MarkdownInlineParser: parses italic formatting with underscores", () => {
    const nodes = parseMarkdownInline("An _italic phrase_ here.");
    const italicNode = nodes.find((n): n is MarkdownEmphasisNode => n.type === "emphasis" && n.kind === "italic");
    assertEquals((italicNode?.children[0] as MarkdownTextNode).value, "italic phrase");
});

Deno.test("unit: MarkdownInlineParser: parses strikethrough with tildes", () => {
    const nodes = parseMarkdownInline("Some ~~deleted text~~ here.");
    const strikeNode = nodes.find((n): n is MarkdownEmphasisNode =>
        n.type === "emphasis" && n.kind === "strikethrough"
    );
    assertEquals((strikeNode?.children[0] as MarkdownTextNode).value, "deleted text");
});

Deno.test("unit: MarkdownInlineParser: parses inline code span without inner formatting", () => {
    const nodes = parseMarkdownInline("Run `const x = **not_bold**;` in bash.");
    const codeNode = nodes.find((n): n is MarkdownCodeSpanNode => n.type === "inline_code");
    assertEquals(codeNode?.code, "const x = **not_bold**;");
});

Deno.test("unit: MarkdownInlineParser: parses explicit link with title", () => {
    const nodes = parseMarkdownInline('Check [Docs](https://example.com "Guide") now.');
    const linkNode = nodes.find((n): n is MarkdownLinkNode => n.type === "link");
    assertEquals(linkNode?.url, "https://example.com");
});

Deno.test("unit: MarkdownInlineParser: parses explicit link title", () => {
    const nodes = parseMarkdownInline('Check [Docs](https://example.com "Guide") now.');
    const linkNode = nodes.find((n): n is MarkdownLinkNode => n.type === "link");
    assertEquals(linkNode?.title, "Guide");
});

Deno.test("unit: MarkdownInlineParser: parses image with alt text", () => {
    const nodes = parseMarkdownInline("View ![App Screenshot](https://example.com/logo.png).");
    const imgNode = nodes.find((n): n is MarkdownImageNode => n.type === "image");
    assertEquals(imgNode?.alt, "App Screenshot");
});

Deno.test("unit: MarkdownInlineParser: shields inline dollar math from formatting", () => {
    const nodes = parseMarkdownInline("Formula $E = mc^2$ in physics.");
    const mathNode = nodes.find((n): n is MarkdownMathInlineNode => n.type === "inline_math");
    assertEquals(mathNode?.formula, "E = mc^2");
});

Deno.test("unit: MarkdownInlineParser: shields inline parenthesis math from formatting", () => {
    const nodes = parseMarkdownInline("Equation \\( \\alpha + \\beta = 1 \\) holds.");
    const mathNode = nodes.find((n): n is MarkdownMathInlineNode => n.type === "inline_math");
    assertEquals(mathNode?.formula, "\\alpha + \\beta = 1");
});

Deno.test("unit: MarkdownInlineParser: ignores currency expressions as plain text", () => {
    const nodes = parseMarkdownInline("Cost is $100 and $200 today.");
    const hasMath = nodes.some((n) => n.type === "inline_math");
    assertEquals(hasMath, false);
});
