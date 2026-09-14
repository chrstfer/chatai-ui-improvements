import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser, Element } from "@b-fuze/deno-dom";
import { DuckAiScraper } from "../../../../src/features/chats/duckai/scraper.ts";
import { DUCKAI_SELECTORS } from "../../../../src/features/chats/duckai/selectors.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

function loadFixture(filename: string): Element {
    const html = Deno.readTextFileSync(`${FIXTURES_DIR}${filename}`);
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error(`Failed to parse fixture: ${filename}`);
    return doc.documentElement as unknown as Element;
}

Deno.test("DuckAiScraper: Extracts pristine code text and resolves canonical formatId", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();

    const codeBlocks = root.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK);
    assertEquals(codeBlocks.length, 2);

    // Block 1: Org mode
    const orgBlock = codeBlocks[0] as Element;
    const orgRef = scraper.parseCodeBlock(orgBlock as unknown as HTMLElement);
    assertNotEquals(orgRef, null);
    assertEquals(orgRef?.rawCode.trim(), "* TODO Task");
    assertEquals(orgRef?.rawHint, "org");
    assertEquals(orgRef?.formatId, "org");
    assertEquals(orgRef?.displayName, "Org Mode");

    // Block 2: Python
    const pyBlock = codeBlocks[1] as Element;
    const pyRef = scraper.parseCodeBlock(pyBlock as unknown as HTMLElement);
    assertNotEquals(pyRef, null);
    assertEquals(pyRef?.rawCode.trim(), 'print("Hello, world!")');
    assertEquals(pyRef?.rawHint, "python");
    assertEquals(pyRef?.formatId, "raw");
});

Deno.test("DuckAiScraper: Detects turn completion via message actions", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();

    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    assertNotEquals(assistantMsg, null);

    const isCompleted = scraper.isTurnCompleted(assistantMsg as unknown as HTMLElement);
    assertEquals(isCompleted, true);

    const turnId = scraper.getTurnId(assistantMsg as unknown as HTMLElement);
    assertEquals(turnId.includes("assistant-message"), true);
});

Deno.test("DuckAiScraper: Extracts structured segments including tables and code blocks", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();

    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const segments = scraper.extractTurnSegments(assistantMsg as unknown as HTMLElement);

    // Should find prose intro, Org code block, Python code block, and table
    const codeSegments = segments.filter((s) => s.type === "code-block");
    assertEquals(codeSegments.length, 2);
    assertEquals(codeSegments[0].language, "org");
    assertEquals(codeSegments[1].language, "python");

    const tableSegments = segments.filter((s) => s.metadata?.kind === "table");
    assertEquals(tableSegments.length, 1);
    assertEquals(tableSegments[0].content.includes("<table"), true);
});

Deno.test("DuckAiScraper: Extracts MathML LaTeX annotations in math turn fixture", () => {
    const root = loadFixture("raw_duckai_math_turn.html");
    const scraper = new DuckAiScraper();

    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const segments = scraper.extractTurnSegments(assistantMsg as unknown as HTMLElement);

    const mathSegments = segments.filter((s) => s.metadata?.kind === "math");
    assertNotEquals(mathSegments.length, 0);
    assertEquals(mathSegments[0].content, "\\lambda + \\alpha = \\beta");
});
