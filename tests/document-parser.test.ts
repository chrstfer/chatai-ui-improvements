import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOrgDocument, serializeOrgSection } from "../src/languages/org/parser/document-parser.ts";

describe("document-parser", () => {
    it("builds recursive AST headline tree with proper nesting", () => {
        const docText = `* Top Level 1
Top text
** Level 2 A
Level 2 A text
*** Level 3
Deep text
** Level 2 B
Level 2 B text
* Top Level 2
Next top text`;

        const ast = parseOrgDocument(docText);

        // Top level has 2 sections
        assert.equal(ast.sections.length, 2);
        assert.equal(ast.sections[0].heading.title, "Top Level 1");
        assert.equal(ast.sections[0].heading.level, 1);
        assert.equal(ast.sections[1].heading.title, "Top Level 2");
        assert.equal(ast.sections[1].heading.level, 1);

        // Section 1 has two children: Level 2 A and Level 2 B
        assert.equal(ast.sections[0].children.length, 2);
        assert.equal(ast.sections[0].children[0].heading.title, "Level 2 A");
        assert.equal(ast.sections[0].children[1].heading.title, "Level 2 B");

        // Level 2 A has one child: Level 3
        assert.equal(ast.sections[0].children[0].children.length, 1);
        assert.equal(ast.sections[0].children[0].children[0].heading.title, "Level 3");
    });

    it("extracts metadata directives into doc.metadata", () => {
        const text = `#+TITLE: Kernel Diagnostics\n#+AUTHOR: chrstfer\n#+OPTIONS: toc:nil\n* Heading`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.metadata.length, 3);
        assert.deepEqual(ast.metadata[0], { key: "TITLE", val: "Kernel Diagnostics" });
        assert.deepEqual(ast.metadata[1], { key: "AUTHOR", val: "chrstfer" });
        assert.deepEqual(ast.metadata[2], { key: "OPTIONS", val: "toc:nil" });
    });

    it("parses property drawers and entries", () => {
        const text = `* Hardware Spec
:PROPERTIES:
:CPU: AMD Ryzen 9
:RAM: 64GB
:END:`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.sections.length, 1);
        const body = ast.sections[0].body;
        assert.equal(body.length, 1);
        assert.equal(body[0].type, "drawer");
        if (body[0].type === "drawer") {
            assert.equal(body[0].name, "PROPERTIES");
            assert.equal(body[0].entries.length, 2);
            assert.deepEqual(body[0].entries[0], { type: "kv", key: "CPU", val: "AMD Ryzen 9" });
            assert.deepEqual(body[0].entries[1], { type: "kv", key: "RAM", val: "64GB" });
        }
    });

    it("parses tables with rows and dividers of arbitrary character widths", () => {
        const text = `| Item | Qty | Price |
|------+-----+-------|
| Switch | 5 | $12.00 |
|-+-+-|
| Router | 2 | $45.00 |
|---|
| Server | 1 | $120.00 |
|-
| Cable | 10 | $1.50 |`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const table = ast.preamble[0];
        assert.equal(table.type, "table");
        if (table.type === "table") {
            assert.equal(table.rows.length, 9);
            assert.deepEqual(table.rows[0].cells, ["Item", "Qty", "Price"]);
            assert.equal(table.rows[1].isDivider, true);
            assert.deepEqual(table.rows[2].cells, ["Switch", "5", "$12.00"]);
            assert.equal(table.rows[3].isDivider, true);
            assert.deepEqual(table.rows[4].cells, ["Router", "2", "$45.00"]);
            assert.equal(table.rows[5].isDivider, true);
            assert.deepEqual(table.rows[6].cells, ["Server", "1", "$120.00"]);
            assert.equal(table.rows[7].isDivider, true);
            assert.deepEqual(table.rows[8].cells, ["Cable", "10", "$1.50"]);
        }
    });

    it("parses tables without dividers and rows without trailing pipes", () => {
        const text = `| Val 1 | Val 2
| Val 3 | Val 4 |`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const table = ast.preamble[0];
        assert.equal(table.type, "table");
        if (table.type === "table") {
            assert.equal(table.hasHeader, false);
            assert.equal(table.rows.length, 2);
            assert.deepEqual(table.rows[0].cells, ["Val 1", "Val 2"]);
            assert.deepEqual(table.rows[1].cells, ["Val 3", "Val 4"]);
        }
    });

    it("parses hierarchical lists and checkboxes", () => {
        const text = `- [ ] Parent task
  - [X] Child task 1
  - [-] Child task 2
- Item :: Term description`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const list = ast.preamble[0];
        assert.equal(list.type, "list");
        if (list.type === "list") {
            assert.equal(list.items.length, 2);
            assert.equal(list.items[0].checkbox, "unchecked");
            assert.equal(list.items[0].children.length, 2);
            assert.equal(list.items[0].children[0].checkbox, "checked");
            assert.equal(list.items[0].children[1].checkbox, "partial");
            assert.equal(list.items[1].term, "Item");
            assert.equal(list.items[1].text, "Term description");
        }
    });

    it("parses source blocks with #+NAME and #+RESULTS", () => {
        const text = `#+NAME: latency_calc
#+BEGIN_SRC python :exports both
print("Latency: 3.41 ms")
#+END_SRC

#+RESULTS: latency_calc
: Latency: 3.41 ms`;
        const ast = parseOrgDocument(text);

        const src = ast.preamble.find((n) => n.type === "src_block");
        assert.ok(src);
        if (src && src.type === "src_block") {
            assert.equal(src.blockType, "src");
            assert.equal(src.lang, "python");
            assert.equal(src.name, "latency_calc");
            assert.equal(src.params, ":exports both");
            assert.deepEqual(src.content, ['print("Latency: 3.41 ms")']);
            assert.ok(src.results);
            assert.deepEqual(src.results?.content, ["Latency: 3.41 ms"]);
        }
    });

    it("parses LaTeX environment blocks", () => {
        const text = `\\begin{equation}
F(x; \\lambda) = 1 - e^{-\\lambda x}
\\end{equation}`;
        const ast = parseOrgDocument(text);

        assert.equal(ast.preamble.length, 1);
        const latex = ast.preamble[0];
        assert.equal(latex.type, "latex_block");
        if (latex.type === "latex_block") {
            assert.equal(latex.environment, "equation");
            assert.ok(latex.content.includes("1 - e^{-\\lambda x}"));
        }
    });

    it("captures rawSubtree for each section and its children", () => {
        const docText = `* Top Level 1
Top text
** Level 2 A
Level 2 A text
*** Level 3
Deep text
** Level 2 B
Level 2 B text
* Top Level 2
Next top text`;

        const ast = parseOrgDocument(docText);

        assert.equal(ast.sections.length, 2);
        // Top Level 1 includes everything until Top Level 2
        assert.equal(
            ast.sections[0].rawSubtree,
            `* Top Level 1\nTop text\n** Level 2 A\nLevel 2 A text\n*** Level 3\nDeep text\n** Level 2 B\nLevel 2 B text`,
        );

        // Level 2 A includes Level 3 but not Level 2 B
        assert.equal(
            ast.sections[0].children[0].rawSubtree,
            `** Level 2 A\nLevel 2 A text\n*** Level 3\nDeep text`,
        );

        // Level 3 subtree
        assert.equal(
            ast.sections[0].children[0].children[0].rawSubtree,
            `*** Level 3\nDeep text`,
        );

        // Level 2 B subtree
        assert.equal(
            ast.sections[0].children[1].rawSubtree,
            `** Level 2 B\nLevel 2 B text`,
        );

        // Top Level 2 subtree
        assert.equal(
            ast.sections[1].rawSubtree,
            `* Top Level 2\nNext top text`,
        );
    });

    it("serializes AST section and document correctly", () => {
        const docText = `* TODO [#A] Main Project [1/2] :PROJECT:URGENT:
Project introduction
:PROPERTIES:
:OWNER: chrstfer
:END:
** Subtask 1
- [X] Completed item
- [ ] Remaining item
** Subtask 2
#+BEGIN_SRC python
print("hello")
#+END_SRC`;

        const ast = parseOrgDocument(docText);
        assert.ok(ast.sections[0].rawSubtree);

        // Test serializeOrgSection
        const serializedSec = serializeOrgSection(ast.sections[0]);
        assert.ok(serializedSec.includes("* TODO [#A] Main Project [1/2] :PROJECT:URGENT:"));
        assert.ok(serializedSec.includes(":PROPERTIES:"));
        assert.ok(serializedSec.includes(":OWNER: chrstfer"));
        assert.ok(serializedSec.includes("** Subtask 1"));
        assert.ok(serializedSec.includes("- [X] Completed item"));
        assert.ok(serializedSec.includes("#+BEGIN_SRC python"));

        // Test fallback AST serialization without rawSubtree
        const clonedSec = JSON.parse(JSON.stringify(ast.sections[0]));
        delete clonedSec.rawSubtree;
        delete clonedSec.children[0].rawSubtree;
        delete clonedSec.children[1].rawSubtree;

        const reconstructed = serializeOrgSection(clonedSec);
        assert.ok(reconstructed.includes("* TODO [#A] Main Project [1/2] :PROJECT:URGENT:"));
        assert.ok(reconstructed.includes(":OWNER: chrstfer"));
        assert.ok(reconstructed.includes("- [X] Completed item"));
        assert.ok(reconstructed.includes("#+BEGIN_SRC python"));
    });
});
