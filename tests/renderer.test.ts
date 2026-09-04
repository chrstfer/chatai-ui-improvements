import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOrgDocument, renderLatexToString } from "../src/languages/org/index.ts";

describe("renderer and latex", () => {
    it("renders LaTeX math to KaTeX HTML without errors", () => {
        const math = "E = mc^2";
        const html = renderLatexToString(math, false);
        assert.ok(html.includes("katex"));
        assert.ok(html.includes("E"));
        assert.ok(html.includes("m"));
        assert.ok(html.includes("c"));

        const displayMath = "\\frac{\\lambda^k e^{-\\lambda}}{k!}";
        const displayHtml = renderLatexToString(displayMath, true);
        assert.ok(displayHtml.includes("katex"));
    });

    it("parses complex Org document with math, source blocks, tables, and nested tasks", () => {
        const doc = `#+TITLE: Performance Analysis
#+AUTHOR: Systems

* Operations :INFRA:
** Task List
- [-] Cluster deployment
  - [X] Step 1: Base images
  - [ ] Step 2: Mesh topology
  - [ ] Step 3: Node validation

#+NAME: latency_calc
#+BEGIN_SRC python :exports both
def p99(): return 3.41
#+END_SRC

#+RESULTS: latency_calc
: 3.41 ms

** Mathematical Modeling
\\begin{equation}
F(x) = 1 - e^{-\\lambda x}
\\end{equation}`;

        const ast = parseOrgDocument(doc);
        assert.equal(ast.metadata[0].val, "Performance Analysis");
        assert.equal(ast.sections.length, 1);
        assert.equal(ast.sections[0].heading.title, "Operations");
        assert.equal(ast.sections[0].children.length, 2);

        // Section 1 child 0: Task List
        const taskListSec = ast.sections[0].children[0];
        const listNode = taskListSec.body.find((n) => n.type === "list");
        assert.ok(listNode);
        if (listNode && listNode.type === "list") {
            assert.equal(listNode.items.length, 1);
            assert.equal(listNode.items[0].text, "Cluster deployment");
            assert.equal(listNode.items[0].children.length, 3);
            assert.equal(listNode.items[0].children[0].checkbox, "checked");
            assert.equal(listNode.items[0].children[1].checkbox, "unchecked");
        }

        // Src block with results
        const srcNode = taskListSec.body.find((n) => n.type === "src_block");
        assert.ok(srcNode);
        if (srcNode && srcNode.type === "src_block") {
            assert.equal(srcNode.name, "latency_calc");
            assert.ok(srcNode.results);
            assert.deepEqual(srcNode.results?.content, ["3.41 ms"]);
        }

        // Section 1 child 1: Mathematical Modeling with LaTeX
        const mathSec = ast.sections[0].children[1];
        const latexNode = mathSec.body.find((n) => n.type === "latex_block");
        assert.ok(latexNode);
        if (latexNode && latexNode.type === "latex_block") {
            assert.equal(latexNode.environment, "equation");
            assert.ok(latexNode.content.includes("1 - e^{-\\lambda x}"));
        }
    });

    it("parses and extracts Gemini Latin sample with math cases, babel, and tables", () => {
        const doc = `* Suspendisse Pulvinar Augue Ac Sem Dictum [2026-08-30 Sun 18:22]
#+OPTIONS: toc:nil num:t

** Typographia et Formatting
Duis arcu tortor *suscipit eget* imperdiet nec /imperdiet iaculis/ ipsum _sed aliquam ultrices_
mauris =lorem_ipsum_generator= sit amet ~nulla_facilisi(void)~. Aliquam lorem ante dapibus 
in viverra quis[fn:1]. Anchor targeting [[*Suspendisse Pulvinar Augue Ac Sem Dictum [2026-08-30 Sun 18:22]][lorem link]] 
et navigation [[https://example.org][vulputate at]].

#+begin_quote
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
#+end_quote

#+begin_verse
Duis aute irure dolor in reprehenderit,
In voluptate velit esse cillum dolore,
Eu fugiat nulla pariatur.
#+end_verse

** Tabula Computata
| Nomen    | Index | Pretium A | Factor B | Fructus (Unit) |
|----------+-------+-----------+----------+----------------|
| <l>      |   <r> |       <r> |      <r> |            <r> |
| Alpha    |     1 |    152.00 |     4.20 |           6.38 |
| Beta     |     2 |    168.00 |     5.10 |           8.57 |
| Gamma    |     3 |    210.00 |     3.80 |           7.98 |
|----------+-------+-----------+----------+----------------|
| Vmean    |       |           |          |           7.64 |
#+TBLFM: $5=($3*$4)/100;%.2f::@5$5=vmean(@2$5..@4$5);%.2f

** Executio Babel
#+NAME: lorem_calculation
#+begin_src python :exports both :results output
def lorem_metric(alpha: float, beta: list[float]) -> float:
    return sum(b * alpha for b in beta)

lorem_values = [0.12, 0.45, 0.08, 1.20]
dolor_result = lorem_metric(2.5, lorem_values)
print(f"Ipsum: {dolor_result:.2f}")
#+end_src

#+RESULTS: lorem_calculation
: Ipsum: 4.63

** Formulae Mathematicae
Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium:

\\begin{equation}
\\mathcal{L}(x; \\alpha, \\beta) = 
\\begin{cases}
\\alpha x^{\\beta - 1} & \\text{ubi } x \\ge 0, \\\\
0                    & \\text{ubi } x < 0.
\\end{cases}
\\end{equation}

At vero eos et accusamus et iusto odio dignissimos ducimus $\\lim_{n \\to \\infty} \\sum_{i=1}^n \\frac{\\alpha_i}{\\beta_i}$.

[fn:1] Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.

* End Gemini Output`;

        const ast = parseOrgDocument(doc);
        assert.equal(ast.sections.length, 2);
        assert.equal(ast.sections[0].heading.title, "Suspendisse Pulvinar Augue Ac Sem Dictum [2026-08-30 Sun 18:22]");
        assert.equal(ast.sections[0].children.length, 4);

        // Section 0: Typographia
        const secTypo = ast.sections[0].children[0];
        assert.equal(secTypo.heading.title, "Typographia et Formatting");
        const quote = secTypo.body.find((b) => b.type === "src_block" && b.blockType === "quote");
        assert.ok(quote);
        const verse = secTypo.body.find((b) => b.type === "src_block" && b.blockType === "verse");
        assert.ok(verse);

        // Section 1: Tabula
        const secTab = ast.sections[0].children[1];
        const table = secTab.body.find((b) => b.type === "table");
        assert.ok(table);
        if (table && table.type === "table") {
            assert.equal(table.rows.length, 8);
            assert.equal(table.hasHeader, true);
        }

        // Section 2: Babel
        const secBabel = ast.sections[0].children[2];
        const src = secBabel.body.find((b) => b.type === "src_block" && b.blockType === "src");
        assert.ok(src);
        if (src && src.type === "src_block") {
            assert.equal(src.name, "lorem_calculation");
            assert.equal(src.lang, "python");
            assert.ok(src.results);
            assert.deepEqual(src.results.content, ["Ipsum: 4.63"]);
        }

        // Section 3: Formulae
        const secMath = ast.sections[0].children[3];
        const latex = secMath.body.find((b) => b.type === "latex_block");
        assert.ok(latex);
        if (latex && latex.type === "latex_block") {
            assert.equal(latex.environment, "equation");
            assert.ok(latex.content.includes("\\begin{cases}"));
        }

        // Section 1: End
        assert.equal(ast.sections[1].heading.title, "End Gemini Output");
    });
});
