import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser, Element } from "@b-fuze/deno-dom";
import { DUCKAI_EXTENSION_INJECTED, DUCKAI_SELECTORS } from "../../../../src/features/chats/duckai/selectors.ts";
import { loadHtmlFixture } from "../../../fixtures/fixture_loader.ts";

function loadDuckDoc(file: string) {
    const html = loadHtmlFixture("duckai", file);
    return new DOMParser().parseFromString(html, "text/html")!;
}

Deno.test("unit: DUCKAI_SELECTORS finds code blocks in raw DOM fixture", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const codeBlocks = doc.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK);
    assertEquals(codeBlocks.length, 2);
});

Deno.test("unit: DUCKAI_SELECTORS extracts language attribute from code block", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const firstBlock = doc.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    assertEquals(firstBlock.getAttribute(DUCKAI_SELECTORS.LANGUAGE_ATTR), "org");
});

Deno.test("unit: DUCKAI_SELECTORS finds code header in code block", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const firstBlock = doc.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    const header = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_HEADER);
    assertNotEquals(header, null);
});

Deno.test("unit: DUCKAI_SELECTORS finds copy button in code block", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const firstBlock = doc.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    const copyBtn = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_COPY_BUTTON);
    assertNotEquals(copyBtn, null);
});

Deno.test("unit: DUCKAI_SELECTORS finds code content text in code block", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const firstBlock = doc.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    const codeContent = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_CONTENT);
    assertEquals(codeContent?.textContent?.trim(), "* TODO Task");
});

Deno.test("unit: DUCKAI_SELECTORS finds tables in raw DOM fixture", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const tables = doc.querySelectorAll(DUCKAI_SELECTORS.TABLE);
    assertEquals(tables.length, 1);
});

Deno.test("unit: DUCKAI_SELECTORS finds table header", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const tableHeader = doc.querySelector(DUCKAI_SELECTORS.TABLE_HEADER);
    assertNotEquals(tableHeader, null);
});

Deno.test("unit: DUCKAI_SELECTORS finds message actions container", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const messageActions = doc.querySelectorAll(DUCKAI_SELECTORS.MESSAGE_ACTIONS);
    assertEquals(messageActions.length, 1);
});

Deno.test("unit: DUCKAI_SELECTORS finds assistant message element", () => {
    const doc = loadDuckDoc("raw_duckai_turn.html");
    const assistantMessages = doc.querySelectorAll(DUCKAI_SELECTORS.ASSISTANT_MESSAGE);
    assertEquals(assistantMessages.length, 1);
});

Deno.test("unit: DUCKAI_SELECTORS finds user queries in math turn fixture", () => {
    const doc = loadDuckDoc("raw_duckai_math_turn.html");
    const userQueries = doc.querySelectorAll(DUCKAI_SELECTORS.USER_QUERY);
    assertEquals(userQueries.length, 1);
});

Deno.test("unit: DUCKAI_SELECTORS finds MathML LaTeX annotation in math turn fixture", () => {
    const doc = loadDuckDoc("raw_duckai_math_turn.html");
    const mathAnnotations = doc.querySelectorAll(DUCKAI_SELECTORS.MATHML_TEX_ANNOTATION);
    assertEquals(mathAnnotations[0].textContent?.trim(), "\\lambda + \\alpha = \\beta");
});

Deno.test("unit: DUCKAI_SELECTORS strictly avoids generated React hash classes", () => {
    const hashClassRegex = /\.[A-Za-z0-9_-]{12,}/;
    const hasHash = Object.values(DUCKAI_SELECTORS).some((sel) => hashClassRegex.test(sel));
    assertEquals(hasHash, false);
});

Deno.test("unit: DUCKAI_EXTENSION_INJECTED uses generic container class", () => {
    assertEquals(DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS, "chatai-rendered-container");
});
