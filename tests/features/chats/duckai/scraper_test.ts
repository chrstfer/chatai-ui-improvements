import { assertEquals } from "@std/assert";
import { DOMParser, Element } from "@b-fuze/deno-dom";
import { DuckAiScraper } from "../../../../src/features/chats/duckai/scraper.ts";
import { DUCKAI_SELECTORS } from "../../../../src/features/chats/duckai/selectors.ts";
import { loadHtmlFixture } from "@internal/tests/fixtures";

function loadFixture(filename: string): Element {
    const html = loadHtmlFixture("duckai", filename);
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error(`Failed to parse fixture: ${filename}`);
    return doc.documentElement as unknown as Element;
}

Deno.test("unit: DuckAiScraper: parses Org code block ref from mock turn fixture", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const orgBlock = root.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    const orgRef = scraper.parseCodeBlock(orgBlock as unknown as HTMLElement);
    assertEquals(orgRef?.rawCode.trim(), "* TODO Task");
});

Deno.test("unit: DuckAiScraper: resolves canonical org formatId for Org code block", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const orgBlock = root.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    const orgRef = scraper.parseCodeBlock(orgBlock as unknown as HTMLElement);
    assertEquals(orgRef?.formatId, "org");
});

Deno.test("unit: DuckAiScraper: resolves display name for Org code block", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const orgBlock = root.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[0] as Element;
    const orgRef = scraper.parseCodeBlock(orgBlock as unknown as HTMLElement);
    assertEquals(orgRef?.displayName, "Org Mode");
});

Deno.test("unit: DuckAiScraper: parses Python code block ref from mock turn fixture", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const pyBlock = root.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[1] as Element;
    const pyRef = scraper.parseCodeBlock(pyBlock as unknown as HTMLElement);
    assertEquals(pyRef?.rawCode.trim(), 'print("Hello, world!")');
});

Deno.test("unit: DuckAiScraper: falls back to raw formatId for standard Python block", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const pyBlock = root.querySelectorAll(DUCKAI_SELECTORS.CODE_BLOCK)[1] as Element;
    const pyRef = scraper.parseCodeBlock(pyBlock as unknown as HTMLElement);
    assertEquals(pyRef?.formatId, "raw");
});

Deno.test("unit: DuckAiScraper: detects completed assistant turn via message actions presence", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const isCompleted = scraper.isTurnCompleted(assistantMsg as unknown as HTMLElement);
    assertEquals(isCompleted, true);
});

Deno.test("unit: DuckAiScraper: generates turn identifier from assistant message", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const turnId = scraper.getTurnId(assistantMsg as unknown as HTMLElement);
    assertEquals(turnId.includes("assistant-message"), true);
});

Deno.test("unit: DuckAiScraper: extracts code block segments from assistant turn", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const segments = scraper.extractTurnSegments(assistantMsg as unknown as HTMLElement);
    const codeSegments = segments.filter((s) => s.type === "code-block");
    assertEquals(codeSegments.length, 2);
});

Deno.test("unit: DuckAiScraper: extracts table segments from assistant turn", () => {
    const root = loadFixture("mock_duckai_turn.html");
    const scraper = new DuckAiScraper();
    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const segments = scraper.extractTurnSegments(assistantMsg as unknown as HTMLElement);
    const tableSegments = segments.filter((s) => s.metadata?.kind === "table");
    assertEquals(tableSegments.length, 1);
});

Deno.test("unit: DuckAiScraper: extracts MathML LaTeX annotation segments from math turn fixture", () => {
    const root = loadFixture("raw_duckai_math_turn.html");
    const scraper = new DuckAiScraper();
    const assistantMsg = root.querySelector(DUCKAI_SELECTORS.ASSISTANT_MESSAGE) as Element;
    const segments = scraper.extractTurnSegments(assistantMsg as unknown as HTMLElement);
    const mathSegments = segments.filter((s) => s.metadata?.kind === "math");
    assertEquals(mathSegments[0]?.content, "\\lambda + \\alpha = \\beta");
});
