import { assertEquals, assertExists } from "@std/assert";
import { defaultLanguageRegistry, LanguageRegistry } from "../../src/languages/registry.ts";
import { orgLanguageDefinition } from "../../src/languages/org/definition.ts";
import type { LanguageDefinition } from "../../src/core/contracts/language.ts";

Deno.test("LanguageRegistry: Resolves default Org language by hint and aliases", () => {
    assertExists(defaultLanguageRegistry.resolve("org"));
    assertExists(defaultLanguageRegistry.resolve("ORG"));
    assertExists(defaultLanguageRegistry.resolve("orgmode"));
    assertExists(defaultLanguageRegistry.resolve("org-mode"));

    const def = defaultLanguageRegistry.resolve("org");
    assertEquals(def?.id, "org");
    assertEquals(def?.name, "Org Mode");
});

Deno.test("LanguageRegistry: matchContent falls back to content inspection", () => {
    // Explicit hint match
    const byHint = defaultLanguageRegistry.matchContent("org", []);
    assertEquals(byHint?.id, "org");

    // Unknown hint, but Org headline in first lines
    const byHeadline = defaultLanguageRegistry.matchContent("code snippet", [
        "* Top-Level Heading",
        "Some body text",
    ]);
    assertEquals(byHeadline?.id, "org");

    // Unknown hint, but #+TITLE: keyword in first lines
    const byTitle = defaultLanguageRegistry.matchContent("", [
        "#+TITLE: Project Specification",
        "* Introduction",
    ]);
    assertEquals(byTitle?.id, "org");

    // Plain Python code should not match Org
    const noMatch = defaultLanguageRegistry.matchContent("python", [
        "def hello():",
        "    print('world')",
    ]);
    assertEquals(noMatch, undefined);
});

Deno.test("LanguageRegistry: formatDisplayName standardizes display labels", () => {
    assertEquals(defaultLanguageRegistry.formatDisplayName("org"), "ORG MODE");
    assertEquals(defaultLanguageRegistry.formatDisplayName("orgmode"), "ORG MODE");
    assertEquals(defaultLanguageRegistry.formatDisplayName("org-mode"), "ORG MODE");
    assertEquals(defaultLanguageRegistry.formatDisplayName("python"), "PYTHON");
    assertEquals(defaultLanguageRegistry.formatDisplayName(""), "CODE");
    assertEquals(defaultLanguageRegistry.formatDisplayName("   "), "CODE");
});

Deno.test("OrgLanguageDefinition: loadView resolves view component", async () => {
    const viewComponent = await orgLanguageDefinition.loadView();
    assertExists(viewComponent);
    assertEquals(typeof viewComponent, "function");
});

Deno.test("OrgLanguageDefinition: parses raw text into AST", () => {
    const doc = orgLanguageDefinition.parse("* Test Headline\nBody text.");
    assertEquals(doc.type, "document");
    assertEquals(doc.children.length, 1);
    assertEquals(doc.children[0].type, "headline");
});

Deno.test("LanguageRegistry: Custom language registration and unregistration", () => {
    const registry = new LanguageRegistry();
    const customLang: LanguageDefinition = {
        id: "markdown",
        name: "Markdown",
        aliases: ["md", "markdown"],
        matches: (hint) => hint === "md" || hint === "markdown",
        loadView: () => Promise.reject(new Error("Not implemented")),
    };

    registry.register(customLang);
    assertEquals(registry.resolve("md")?.id, "markdown");
    assertEquals(registry.resolve("MARKDOWN")?.id, "markdown");
    assertEquals(registry.formatDisplayName("md"), "MARKDOWN");

    assertEquals(registry.unregister("markdown"), true);
    assertEquals(registry.resolve("md"), undefined);
});
