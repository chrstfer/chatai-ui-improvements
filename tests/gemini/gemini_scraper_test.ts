import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { GEMINI_SELECTORS } from "../../src/features/chats/gemini/selectors.ts";
import { GeminiScraper } from "../../src/features/chats/gemini/scraper.ts";
import { GeminiSiteAdapter } from "../../src/features/chats/gemini/adapter.ts";
import { GeminiThemeAuthority } from "../../src/features/chats/gemini/theme.ts";

const FIXTURES_DIR = new URL("./html/", import.meta.url).pathname;

function loadRawFixture(filename: string) {
    const html = Deno.readTextFileSync(`${FIXTURES_DIR}${filename}`);
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error(`Failed to parse HTML fixture: ${filename}`);
    return doc;
}

Deno.test("GEMINI_SELECTORS: Locates turn container and completed footer in raw single-turn.html", () => {
    const doc = loadRawFixture("single-turn.html");
    const turns = doc.querySelectorAll(GEMINI_SELECTORS.TURN_CONTAINER);
    assertEquals(turns.length, 1, "Should find exactly 1 conversation turn");

    const turnEl = turns[0] as unknown as HTMLElement;
    const scraper = new GeminiScraper();
    const isCompleted = scraper.isTurnCompleted(turnEl);
    assertEquals(isCompleted, true, "Turn with footer message-actions should be recognized as completed");
});

Deno.test("GEMINI_SELECTORS: Discovers conversation turns and scroller in raw-with-plain-org-and-mixed.html", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const turns = doc.querySelectorAll(GEMINI_SELECTORS.TURN_CONTAINER);
    assertEquals(turns.length, 4, "Should find 4 conversation turns");

    const codeBlocks = doc.querySelectorAll(GEMINI_SELECTORS.CODE_BLOCK);
    assertEquals(codeBlocks.length, 4, "Should find 4 code blocks across turns");
});

Deno.test("GeminiScraper: Extracts exact raw text from data-island without corruption", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const scraper = new GeminiScraper();
    const codeBlocks = doc.querySelectorAll(GEMINI_SELECTORS.CODE_BLOCK);

    for (const block of codeBlocks) {
        const text = scraper.extractCodeText(block as unknown as HTMLElement);
        assertNotEquals(text.length, 0, "Data-island code text must not be empty");
        assertNotEquals(text.trim(), "", "Extracted code text must contain characters");
    }
});

Deno.test("GeminiScraper: Discerning language hints (Org mode heuristic vs explicit Python)", () => {
    const doc = loadRawFixture("raw-with-plain-org-and-mixed.html");
    const scraper = new GeminiScraper();
    const codeBlocks = Array.from(doc.querySelectorAll(GEMINI_SELECTORS.CODE_BLOCK));

    const parsedBlocks = codeBlocks.map((block) => scraper.parseCodeBlock(block as unknown as HTMLElement)).filter((
        b,
    ): b is NonNullable<typeof b> => b !== null);

    assertEquals(parsedBlocks.length, 4, "Should parse all 4 code blocks");

    // First 3 blocks are Org mode formatted with generic headers
    const orgBlocks = parsedBlocks.filter((b) => b.languageHint === "org");
    assertEquals(orgBlocks.length, 3, "Three blocks should be classified as 'org' by heuristic");

    // Fourth block is explicit Python
    const pythonBlock = parsedBlocks.find((b) => b.languageHint === "python");
    assertNotEquals(pythonBlock, undefined, "One block should be classified as 'python'");
    assertEquals(pythonBlock?.rawText.startsWith("def lorem_ipsum_generator"), true);
});

Deno.test("GeminiScraper: Parses single code block from raw first.html fixture", () => {
    const doc = loadRawFixture("first.html");
    const scraper = new GeminiScraper();
    const codeBlock = doc.querySelector(GEMINI_SELECTORS.CODE_BLOCK);
    assertNotEquals(codeBlock, null, "Should find code-block in first.html");

    const parsed = scraper.parseCodeBlock(codeBlock as unknown as HTMLElement);
    assertNotEquals(parsed, null, "parseCodeBlock should return structured ref");
    assertEquals(parsed?.isSettled, true, "Turn in first.html is complete");
    assertNotEquals(parsed?.rawText.length, 0);
});

Deno.test("GeminiSiteAdapter: Matches URL contract strictly for gemini.google.com", () => {
    const adapter = new GeminiSiteAdapter();
    assertEquals(adapter.id, "gemini");
    assertEquals(adapter.name, "Google Gemini");
    assertEquals(adapter.themeAuthority.supportsTheming, true);

    assertEquals(adapter.matches(new URL("https://gemini.google.com/app")), true);
    assertEquals(adapter.matches(new URL("https://gemini.google.com/u/1/app")), true);
    assertEquals(adapter.matches(new URL("https://duck.ai/")), false);
    assertEquals(adapter.matches(new URL("https://chatgpt.com/")), false);
});

Deno.test("GeminiThemeAuthority: Reports theme mode based on DOM markers", () => {
    const authority = new GeminiThemeAuthority();
    // In non-browser environment (no document.body by default or mocked), getTheme() handles gracefully
    const theme = authority.getTheme();
    assertEquals(typeof theme, "string");
    authority.destroy();
});
