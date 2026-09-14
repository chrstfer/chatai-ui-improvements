import { assertEquals } from "@std/assert";
import { parseMarkdownBlocks } from "../../../../src/features/parsers/markdown/blockParser.ts";
import type { MarkdownAlertNode, MarkdownParagraphNode } from "../../../../src/features/parsers/markdown/types.ts";

Deno.test("unit: MarkdownCalloutParser: maps NOTE variant from uppercase marker", () => {
    const md = "> [!NOTE]\n> Take this into account.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.variant, "NOTE");
});

Deno.test("unit: MarkdownCalloutParser: maps TIP variant from uppercase marker", () => {
    const md = "> [!TIP]\n> Useful performance advice.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.variant, "TIP");
});

Deno.test("unit: MarkdownCalloutParser: maps IMPORTANT variant from uppercase marker", () => {
    const md = "> [!IMPORTANT]\n> Critical setup requirement.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.variant, "IMPORTANT");
});

Deno.test("unit: MarkdownCalloutParser: maps WARNING variant from uppercase marker", () => {
    const md = "> [!WARNING]\n> Breaking change imminent.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.variant, "WARNING");
});

Deno.test("unit: MarkdownCalloutParser: maps CAUTION variant from uppercase marker", () => {
    const md = "> [!CAUTION]\n> Danger of data corruption.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.variant, "CAUTION");
});

Deno.test("unit: MarkdownCalloutParser: normalizes lowercase variant to uppercase", () => {
    const md = "> [!tip]\n> Lowercase tip advice.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.variant, "TIP");
});

Deno.test("unit: MarkdownCalloutParser: captures optional custom inline title", () => {
    const md = "> [!NOTE] Custom Storage Boundary\n> Details.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.title, "Custom Storage Boundary");
});

Deno.test("unit: MarkdownCalloutParser: supplies default title when custom title omitted", () => {
    const md = "> [!NOTE]\n> Standard note body.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    assertEquals(alert.title, "Note");
});

Deno.test("unit: MarkdownCalloutParser: parses callout body lines as block children", () => {
    const md = "> [!NOTE]\n> First line of body.";
    const blocks = parseMarkdownBlocks(md);
    const alert = blocks[0] as MarkdownAlertNode;
    const bodyPara = alert.children[0] as MarkdownParagraphNode;
    assertEquals(bodyPara.type, "paragraph");
});
