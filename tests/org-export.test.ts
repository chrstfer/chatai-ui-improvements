/**
 * Unit Tests for Markdown AST to Org-Mode Plaintext Serializer
 */

import { assertEquals } from "@std/assert";
import { parseMarkdown } from "../src/languages/markdown/index.ts";
import { exportMarkdownToOrg } from "../src/languages/org/export/markdown-to-org.ts";

Deno.test("exportMarkdownToOrg", async (t) => {
    await t.step("converts markdown headings to Org headline stars with parent depth offset", () => {
        const md = `# Section One\nText\n## Section Two\nSubtext`;
        const ast = parseMarkdown(md);

        // Under top-level parent depth 1 (e.g. within * Gemini turn)
        const orgText = exportMarkdownToOrg(ast, { parentDepth: 1 });
        assertEquals(orgText.includes("** Section One"), true);
        assertEquals(orgText.includes("*** Section Two"), true);
    });

    await t.step("unwraps Org code blocks and re-levels internal heading stars", () => {
        const md = `## Architecture Spec
Below is the system plan:
\`\`\`org
* Core Engine
:PROPERTIES:
:ID: 100
:END:
** Block Parser
*** Inline Lexer
* Export System
\`\`\``;
        const ast = parseMarkdown(md);
        const orgText = exportMarkdownToOrg(ast, { parentDepth: 1, unwrapOrgBlocks: true });

        // `## Architecture Spec` at parent depth 1 becomes `*** Architecture Spec` (level 3).
        // The embedded Org block's `* Core Engine` (level 1) re-levels to level 3 + 1 = `**** Core Engine`.
        // `** Block Parser` re-levels to level 3 + 2 = `***** Block Parser`.
        // `* Export System` re-levels to level 3 + 1 = `**** Export System`.
        assertEquals(orgText.includes("*** Architecture Spec"), true);
        assertEquals(orgText.includes("**** Core Engine"), true);
        assertEquals(orgText.includes(":PROPERTIES:"), true);
        assertEquals(orgText.includes(":ID: 100"), true);
        assertEquals(orgText.includes("***** Block Parser"), true);
        assertEquals(orgText.includes("****** Inline Lexer"), true);
        assertEquals(orgText.includes("**** Export System"), true);

        // Markdown code fence ``` should NOT be present
        assertEquals(orgText.includes("```"), false);
        assertEquals(orgText.includes("#+BEGIN_SRC org"), false);
    });

    await t.step("formats non-Org code blocks as #+BEGIN_SRC <lang>", () => {
        const md = '```rust\nfn main() {\n    println!("hello");\n}\n```';
        const ast = parseMarkdown(md);
        const orgText = exportMarkdownToOrg(ast);

        assertEquals(orgText.includes("#+BEGIN_SRC rust"), true);
        assertEquals(orgText.includes("fn main() {"), true);
        assertEquals(orgText.includes("#+END_SRC"), true);
    });

    await t.step("formats tables, lists, and inline styles into Org syntax", () => {
        const md = `| Host | Port |
|---|---|
| localhost | 8080 |

- [X] Initialized **bold** task
- [ ] Remaining *italic* with [Link](https://example.com) and \`code\``;

        const ast = parseMarkdown(md);
        const orgText = exportMarkdownToOrg(ast);

        // Table
        assertEquals(orgText.includes("| Host | Port |"), true);
        assertEquals(orgText.includes("|-----+-----|"), true);
        assertEquals(orgText.includes("| localhost | 8080 |"), true);

        // Checkboxes & Inlines
        assertEquals(orgText.includes("- [X] Initialized *bold* task"), true);
        assertEquals(orgText.includes("- [ ] Remaining /italic/ with [[https://example.com][Link]] and ~code~"), true);
    });

    await t.step("formats blockquotes as #+BEGIN_QUOTE", () => {
        const md = "> This is an important warning.";
        const ast = parseMarkdown(md);
        const orgText = exportMarkdownToOrg(ast);

        assertEquals(orgText.includes("#+BEGIN_QUOTE"), true);
        assertEquals(orgText.includes("This is an important warning."), true);
        assertEquals(orgText.includes("#+END_QUOTE"), true);
    });
});
