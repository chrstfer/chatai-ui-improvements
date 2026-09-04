import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isOrgContent, parseOrgDocument } from "../src/languages/org/index.ts";

describe("OrgParser facade", () => {
    it("full pipeline end-to-end AST extraction", () => {
        const sample = `#+TITLE: Full Pipeline Test
#+AUTHOR: chrstfer

* TODO [#A] Verify complete Org pipeline :TEST:
This is a *bold* link to [[https://example.com/api][API Docs]] with a ~code block~.

** Subtask
- [X] Step 1
- [ ] Step 2

| Col 1 | Col 2 |
|-------+-------|
| Val A | 100   |

#+BEGIN_SRC bash
echo "hello world"
#+END_SRC`;

        // 1. Detection
        assert.equal(isOrgContent(sample), true);

        // 2. AST parsing
        const ast = parseOrgDocument(sample);
        assert.equal(ast.metadata[0].val, "Full Pipeline Test");
        assert.equal(ast.sections.length, 1);
        assert.equal(ast.sections[0].heading.title, "Verify complete Org pipeline");
        assert.equal(ast.sections[0].heading.status, "TODO");
        assert.equal(ast.sections[0].heading.priority, "A");
        assert.deepEqual(ast.sections[0].heading.tags, ["TEST"]);

        // Section children
        assert.equal(ast.sections[0].children.length, 1);
        assert.equal(ast.sections[0].children[0].heading.title, "Subtask");

        // Subtask list
        const subList = ast.sections[0].children[0].body.find((n) => n.type === "list");
        assert.ok(subList);
        if (subList && subList.type === "list") {
            assert.equal(subList.items.length, 2);
            assert.equal(subList.items[0].checkbox, "checked");
            assert.equal(subList.items[1].checkbox, "unchecked");
        }

        // Subtask table
        const subTable = ast.sections[0].children[0].body.find((n) => n.type === "table");
        assert.ok(subTable);

        // Subtask src block
        const subSrc = ast.sections[0].children[0].body.find((n) => n.type === "src_block");
        assert.ok(subSrc);
        if (subSrc && subSrc.type === "src_block") {
            assert.equal(subSrc.lang, "bash");
            assert.deepEqual(subSrc.content, ['echo "hello world"']);
        }
    });
});
