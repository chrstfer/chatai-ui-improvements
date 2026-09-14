import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser, Element } from "@b-fuze/deno-dom";
import { DUCKAI_EXTENSION_INJECTED, DUCKAI_SELECTORS } from "../../../../src/features/chats/duckai/selectors.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

Deno.test("DuckAiSelectors: Matches authentic code block elements in raw DOM fixture", async () => {
    const html = await Deno.readTextFile(`${FIXTURES_DIR}raw_duckai_turn.html`);
    const doc = new DOMParser().parseFromString(html, "text/html");

    const codeBlocks = doc.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK);
    assertEquals(codeBlocks.length, 2);

    const firstBlock = codeBlocks[0] as Element;
    assertEquals(firstBlock.getAttribute(DUCKAI_SELECTORS.LANGUAGE_ATTR), "org");

    const header = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_HEADER);
    assertNotEquals(header, null);

    const copyBtn = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_COPY_BUTTON);
    assertNotEquals(copyBtn, null);

    const codeBody = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_BODY);
    assertNotEquals(codeBody, null);

    const codeContent = firstBlock.querySelector(DUCKAI_SELECTORS.CODE_CONTENT);
    assertNotEquals(codeContent, null);
    assertEquals(codeContent?.textContent?.trim(), "* TODO Task");
});

Deno.test("DuckAiSelectors: Matches tables, message actions, and assistant messages", async () => {
    const html = await Deno.readTextFile(`${FIXTURES_DIR}raw_duckai_turn.html`);
    const doc = new DOMParser().parseFromString(html, "text/html");

    const tables = doc.querySelectorAll(DUCKAI_SELECTORS.TABLE);
    assertEquals(tables.length, 1);

    const tableHeader = doc.querySelector(DUCKAI_SELECTORS.TABLE_HEADER);
    assertNotEquals(tableHeader, null);

    const tableBody = doc.querySelector(DUCKAI_SELECTORS.TABLE_BODY);
    assertNotEquals(tableBody, null);

    const messageActions = doc.querySelectorAll(DUCKAI_SELECTORS.MESSAGE_ACTIONS);
    assertEquals(messageActions.length, 1);

    const assistantMessages = doc.querySelectorAll(DUCKAI_SELECTORS.ASSISTANT_MESSAGE);
    assertEquals(assistantMessages.length, 1);
});

Deno.test("DuckAiSelectors: Matches MathML LaTeX annotations in math turn fixture", async () => {
    const html = await Deno.readTextFile(`${FIXTURES_DIR}raw_duckai_math_turn.html`);
    const doc = new DOMParser().parseFromString(html, "text/html");

    const userQueries = doc.querySelectorAll(DUCKAI_SELECTORS.USER_QUERY);
    assertEquals(userQueries.length, 1);

    const mathAnnotations = doc.querySelectorAll(DUCKAI_SELECTORS.MATHML_TEX_ANNOTATION);
    assertEquals(mathAnnotations.length, 2);
    assertEquals(mathAnnotations[0].textContent?.trim(), "\\lambda + \\alpha = \\beta");
});

Deno.test("DuckAiSelectors: Strictly prohibits generated React hash classes", () => {
    // Regex checking for minified React class patterns like .ulhFWA5BGGH5z8M1KsWn
    const hashClassRegex = /\.[A-Za-z0-9_-]{12,}/;

    for (const [key, selector] of Object.entries(DUCKAI_SELECTORS)) {
        const matchesHash = hashClassRegex.test(selector);
        assertEquals(
            matchesHash,
            false,
            `Selector ${key} (${selector}) must not contain generated React hash classes!`,
        );
    }

    // Verify container class name is properly generic
    assertEquals(DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS, "chatai-rendered-container");
    assertEquals(DUCKAI_EXTENSION_INJECTED.CONTAINER_CLASS.includes("orgmod"), false);
});
