/**
 * Unit Tests for Markdown AST Parser and Inline Tokenizer
 */

import { assertEquals } from "@std/assert";
import { parseMarkdown } from "../src/languages/markdown/parser/markdown-parser.ts";
import { tokenizeMarkdownInline } from "../src/languages/markdown/parser/inline-lexer.ts";

Deno.test("markdown inline tokenizer", async (t) => {
    await t.step("tokenizes bold, italic, bold_italic, code, strike", () => {
        const input = "Plain ***bold italic*** and **bold** and *italic* and `code` and ~~strike~~";
        const tokens = tokenizeMarkdownInline(input);

        assertEquals(tokens.some((tok) => tok.type === "bold_italic"), true);
        assertEquals(tokens.some((tok) => tok.type === "bold"), true);
        assertEquals(tokens.some((tok) => tok.type === "italic"), true);
        assertEquals(tokens.some((tok) => tok.type === "code_inline" && tok.value === "code"), true);
        assertEquals(tokens.some((tok) => tok.type === "strike"), true);
    });

    await t.step("tokenizes links with target and text", () => {
        const input = "Check out [Documentation](https://example.com/docs) for help.";
        const tokens = tokenizeMarkdownInline(input);

        const linkTok = tokens.find((tok) => tok.type === "link");
        assertEquals(linkTok !== undefined, true);
        if (linkTok && linkTok.type === "link") {
            assertEquals(linkTok.text, "Documentation");
            assertEquals(linkTok.href, "https://example.com/docs");
        }
    });

    await t.step("tokenizes inline math formulas ($...$ and \\(...\\))", () => {
        const input = "Formula $E = mc^2$ and \\(\\alpha + \\beta\\)";
        const tokens = tokenizeMarkdownInline(input);

        const mathToks = tokens.filter((tok) => tok.type === "math_inline");
        assertEquals(mathToks.length, 2);
        assertEquals(mathToks[0].type === "math_inline" && mathToks[0].math, "E = mc^2");
        assertEquals(mathToks[1].type === "math_inline" && mathToks[1].math, "\\alpha + \\beta");
    });
});

Deno.test("markdown block parser", async (t) => {
    await t.step("parses headings level 1 to 6", () => {
        const input = `# Heading 1\n## Heading 2\n### Heading 3\n#### Heading 4\n##### Heading 5\n###### Heading 6`;
        const doc = parseMarkdown(input);

        assertEquals(doc.children.length, 6);
        for (let i = 0; i < 6; i++) {
            const h = doc.children[i];
            assertEquals(h.type, "heading");
            if (h.type === "heading") {
                assertEquals(h.level, i + 1);
                assertEquals(h.raw, `Heading ${i + 1}`);
            }
        }
    });

    await t.step("parses fenced code blocks and identifies Org mode blocks", () => {
        const input = "```typescript\nconst a = 1;\n```\n\n```org\n* TODO First Item\n:PROPERTIES:\n:ID: 1\n:END:\n```";
        const doc = parseMarkdown(input);

        assertEquals(doc.children.length, 2);
        const b1 = doc.children[0];
        const b2 = doc.children[1];

        assertEquals(b1.type, "code_block");
        if (b1.type === "code_block") {
            assertEquals(b1.lang, "typescript");
            assertEquals(b1.isOrg, false);
            assertEquals(b1.content, "const a = 1;");
        }

        assertEquals(b2.type, "code_block");
        if (b2.type === "code_block") {
            assertEquals(b2.lang, "org");
            assertEquals(b2.isOrg, true);
            assertEquals(b2.content.includes("* TODO First Item"), true);
        }
    });

    await t.step("parses tables with headers and alignment", () => {
        const input = `| Name | Role | Rating |
|:-----|:----:|-------:|
| Alice | Admin | 95 |
| Bob | User | 80 |`;
        const doc = parseMarkdown(input);

        assertEquals(doc.children.length, 1);
        const table = doc.children[0];
        assertEquals(table.type, "table");
        if (table.type === "table") {
            assertEquals(table.headers.length, 3);
            assertEquals(table.alignments, ["left", "center", "right"]);
            assertEquals(table.rows.length, 2);
            assertEquals(table.rows[0][0].raw, "Alice");
            assertEquals(table.rows[1][0].raw, "Bob");
        }
    });

    await t.step("parses ordered, unordered, and task lists with nesting", () => {
        const input = `- [ ] Task 1
- [X] Task 2
- Regular item
  1. Sub item A
  2. Sub item B`;
        const doc = parseMarkdown(input);

        assertEquals(doc.children.length, 1);
        const list = doc.children[0];
        assertEquals(list.type, "list");
        if (list.type === "list") {
            assertEquals(list.items.length, 3);
            assertEquals(list.items[0].checked, false);
            assertEquals(list.items[1].checked, true);
            assertEquals(list.items[2].checked, null);
        }
    });

    await t.step("parses blockquotes and display math blocks", () => {
        const input = `> This is a quote\n> with two lines\n\n$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$`;
        const doc = parseMarkdown(input);

        assertEquals(doc.children.length, 2);
        assertEquals(doc.children[0].type, "blockquote");
        assertEquals(doc.children[1].type, "math_block");
    });
});
