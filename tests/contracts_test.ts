import { assertEquals } from "@std/assert";
import type { ConversationTurnNode, LanguageDefinition, SiteAdapter } from "../src/core/contracts/index.ts";

Deno.test("LanguageDefinition matches contract evaluates aliases, Code snippet, and untagged blocks", () => {
    const dummyOrgDef: LanguageDefinition = {
        id: "org",
        name: "Org Mode",
        aliases: ["org", "org-mode"],
        matches(hint: string, firstLines: readonly string[]) {
            const normalized = hint.toLowerCase().trim();
            if (this.aliases.includes(normalized)) return true;
            // Heuristic fallback for generic host labels ("Plain text", "Code snippet") or missing/untagged hint
            const isGenericOrMissing = normalized === "" || normalized === "plain text" ||
                normalized === "code snippet";
            if (isGenericOrMissing) {
                return firstLines.some((line) => line.startsWith("* ") || line.startsWith("#+TITLE:"));
            }
            return false;
        },
        loadView() {
            // Mock view component loader returning a Promise
            return Promise.resolve(() => null);
        },
    };

    // Explicit alias match
    assertEquals(dummyOrgDef.matches("org", []), true);
    assertEquals(dummyOrgDef.matches("org-mode", []), true);
    assertEquals(dummyOrgDef.matches("python", []), false);

    // Fallback heuristic: "Plain text" or "Code snippet" with Org syntax
    assertEquals(dummyOrgDef.matches("Plain text", ["* Headline 1", "Body"]), true);
    assertEquals(dummyOrgDef.matches("Code snippet", ["* Headline 1", "Body"]), true);

    // Untagged / missing language hint (empty string or whitespace) with Org syntax
    assertEquals(dummyOrgDef.matches("", ["* Headline 1", "Body"]), true);
    assertEquals(dummyOrgDef.matches("   ", ["#+TITLE: Test Document", "Body"]), true);

    // Untagged or generic hint without Org syntax should not match
    assertEquals(dummyOrgDef.matches("Code snippet", ["def foo():", "  return 42"]), false);
    assertEquals(dummyOrgDef.matches("", ["console.log('hello');"]), false);
});

Deno.test("SiteAdapter interface enforces theme authority and lifecycle contracts", () => {
    let initialized = false;
    let destroyed = false;
    let activeTheme: "light" | "dark" = "dark";

    const mockAdapter: SiteAdapter = {
        id: "gemini",
        name: "Google Gemini",
        themeAuthority: {
            supportsTheming: true,
            getTheme: () => activeTheme,
            onThemeChange: (cb) => {
                cb(activeTheme);
                return () => {};
            },
        },
        matches(url: URL) {
            return url.hostname === "gemini.google.com";
        },
        initialize() {
            initialized = true;
        },
        destroy() {
            destroyed = true;
        },
    };

    assertEquals(mockAdapter.matches(new URL("https://gemini.google.com/app")), true);
    assertEquals(mockAdapter.matches(new URL("https://chatgpt.com/")), false);
    assertEquals(mockAdapter.themeAuthority.getTheme(), "dark");

    // Verify theme transition callback
    activeTheme = "light";
    mockAdapter.themeAuthority.onThemeChange((theme) => {
        assertEquals(theme, "light");
    });
    assertEquals(mockAdapter.themeAuthority.getTheme(), "light");

    mockAdapter.initialize();
    assertEquals(initialized, true);

    mockAdapter.destroy();
    assertEquals(destroyed, true);
});

Deno.test("ConversationTurnNode enforces paired query and segmented response", () => {
    const turn: ConversationTurnNode = {
        id: "turn-1",
        parentTurnId: null,
        timestamp: Date.now(),
        userQuery: "Generate an org file",
        modelResponse: [
            { type: "prose", content: "Sure, here is your document:" },
            { type: "code-block", content: "* Task 1\n** Subtask", language: "org" },
        ],
        isCompleted: true,
    };

    assertEquals(turn.userQuery, "Generate an org file");
    assertEquals(turn.modelResponse.length, 2);
    assertEquals(turn.modelResponse[0].type, "prose");
    assertEquals(turn.modelResponse[1].type, "code-block");
    assertEquals(turn.isCompleted, true);
});
