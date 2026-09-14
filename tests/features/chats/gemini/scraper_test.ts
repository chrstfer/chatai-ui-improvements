import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { GEMINI_SELECTORS } from "../../../../src/features/chats/gemini/selectors.ts";
import { GeminiScraper } from "../../../../src/features/chats/gemini/scraper.ts";
import { GeminiThemeAuthority } from "../../../../src/features/chats/gemini/theme.ts";
import { loadHtmlFixture } from "../../../fixtures/fixture_loader.ts";

function loadRawFixture(filename: string) {
    const html = loadHtmlFixture("gemini", filename);
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error(`Failed to parse HTML fixture: ${filename}`);
    return doc;
}

Deno.test("unit: GEMINI_SELECTORS locates turn container in single-turn.html", () => {
    const doc = loadRawFixture("single-turn.html");
    const turns = doc.querySelectorAll(GEMINI_SELECTORS.TURN_CONTAINER);
    assertEquals(turns.length, 1);
});

Deno.test("unit: GeminiScraper recognizes completed turn footer in single-turn.html", () => {
    const doc = loadRawFixture("single-turn.html");
    const turns = doc.querySelectorAll(GEMINI_SELECTORS.TURN_CONTAINER);
    const turnEl = turns[0] as unknown as HTMLElement;
    const scraper = new GeminiScraper();
    const isCompleted = scraper.isTurnCompleted(turnEl);
    assertEquals(isCompleted, true);
});

Deno.test("unit: GEMINI_SELECTORS discovers conversation turns in raw-with-plain-org-and-mixed.html", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const turns = doc.querySelectorAll(GEMINI_SELECTORS.TURN_CONTAINER);
    assertEquals(turns.length, 4);
});

Deno.test("unit: GEMINI_SELECTORS discovers code blocks across turns in raw-with-plain-org-and-mixed.html", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const codeBlocks = doc.querySelectorAll(GEMINI_SELECTORS.CODE_BLOCK);
    assertEquals(codeBlocks.length, 4);
});

Deno.test("unit: GeminiScraper extracts non-empty raw text from data-island", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const scraper = new GeminiScraper();
    const firstBlock = doc.querySelector(GEMINI_SELECTORS.CODE_BLOCK);
    const text = scraper.extractCodeText(firstBlock as unknown as HTMLElement);
    assertNotEquals(text.trim(), "");
});

Deno.test("unit: GeminiScraper classifies ambiguous Org code blocks via content heuristics", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const scraper = new GeminiScraper();
    const codeBlocks = Array.from(doc.querySelectorAll(GEMINI_SELECTORS.CODE_BLOCK));
    const parsedBlocks = codeBlocks.map((block) => scraper.parseCodeBlock(block as unknown as HTMLElement)).filter((
        b,
    ): b is NonNullable<typeof b> => b !== null);
    const orgBlocks = parsedBlocks.filter((b) => b.languageHint === "org");
    assertEquals(orgBlocks.length, 3);
});

Deno.test("unit: GeminiScraper preserves explicit python language hint", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const scraper = new GeminiScraper();
    const codeBlocks = Array.from(doc.querySelectorAll(GEMINI_SELECTORS.CODE_BLOCK));
    const parsedBlocks = codeBlocks.map((block) => scraper.parseCodeBlock(block as unknown as HTMLElement)).filter((
        b,
    ): b is NonNullable<typeof b> => b !== null);
    const pythonBlock = parsedBlocks.find((b) => b.languageHint === "python");
    assertEquals(pythonBlock?.languageHint, "python");
});

Deno.test("unit: GeminiScraper parses code block ref from first.html fixture", () => {
    const doc = loadRawFixture("first.html");
    const scraper = new GeminiScraper();
    const codeBlock = doc.querySelector(GEMINI_SELECTORS.CODE_BLOCK);
    const parsed = scraper.parseCodeBlock(codeBlock as unknown as HTMLElement);
    assertNotEquals(parsed, null);
});

Deno.test("unit: GeminiScraper marks settled state for complete turn in first.html", () => {
    const doc = loadRawFixture("first.html");
    const scraper = new GeminiScraper();
    const codeBlock = doc.querySelector(GEMINI_SELECTORS.CODE_BLOCK);
    const parsed = scraper.parseCodeBlock(codeBlock as unknown as HTMLElement);
    assertEquals(parsed?.isSettled, true);
});

Deno.test("unit: GeminiThemeAuthority reports current theme string", () => {
    const authority = new GeminiThemeAuthority();
    try {
        const theme = authority.getTheme();
        assertEquals(typeof theme, "string");
    } finally {
        authority.destroy();
    }
});
