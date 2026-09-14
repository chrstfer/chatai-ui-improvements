import { assertEquals } from "@std/assert";
import { parseMarkdownBlocks } from "@internal/features/parsers/markdown";
import type { MarkdownTableNode, MarkdownTextNode } from "@internal/features/parsers/markdown";

Deno.test("unit: MarkdownTableParser: parses table header columns", () => {
    const md = "| A | B |\n| --- | --- |\n| 1 | 2 |";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    assertEquals(table.header.cells.length, 2);
});

Deno.test("unit: MarkdownTableParser: parses column alignment from delimiter row", () => {
    const md = "| Left | Center | Right |\n| :--- | :---: | ---: |\n| 1 | 2 | 3 |";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    assertEquals(table.alignments, ["left", "center", "right"]);
});

Deno.test("unit: MarkdownTableParser: parses body data rows", () => {
    const md = "| Col1 | Col2 |\n| --- | --- |\n| Row1 | Val1 |\n| Row2 | Val2 |";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    assertEquals(table.rows.length, 2);
});

Deno.test("unit: MarkdownTableParser: normalizes missing trailing pipe gracefully", () => {
    const md = "| Col1 | Col2\n| --- | ---\n| Val1 | Val2";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    assertEquals(table.rows.length, 1);
});

Deno.test("unit: MarkdownTableParser: pads missing body cells to match header column count", () => {
    const md = "| Col1 | Col2 | Col3 |\n| --- | --- | --- |\n| OnlyOne |";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    assertEquals(table.rows[0].cells.length, 3);
});

Deno.test("unit: MarkdownTableParser: clamps extra body cells exceeding header column count", () => {
    const md = "| Col1 | Col2 |\n| --- | --- |\n| 1 | 2 | 3 | 4 |";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    assertEquals(table.rows[0].cells.length, 2);
});

Deno.test("unit: MarkdownTableParser: trims whitespace from cell values", () => {
    const md = "|  Padded Name  |  Value  |\n| --- | --- |\n|   Alpha   |   Beta   |";
    const blocks = parseMarkdownBlocks(md);
    const table = blocks[0] as MarkdownTableNode;
    const firstCellText = (table.rows[0].cells[0].children[0] as MarkdownTextNode).value;
    assertEquals(firstCellText, "Alpha");
});
