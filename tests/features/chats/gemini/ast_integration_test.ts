import { assertEquals, assertFalse } from "@std/assert";
import { GeminiInjector } from "../../../../src/features/chats/gemini/injector.tsx";
import type { GeminiCodeBlockRef } from "../../../../src/features/chats/gemini/types.ts";
import { defaultParserRegistry } from "@internal/registries";
import { defaultAstCache } from "@internal/store";
import { computeContentHash } from "@internal/core/utils";
import type { OrgDocumentElement } from "@internal/features/parsers/org";
import { setupTestDom } from "@internal/tests/fixtures";

function setupGeminiDom() {
    const res = setupTestDom({
        html:
            '<!DOCTYPE html><html><body><div id="turn-container"><div id="code-block-host" style="display: block;"></div></div></body></html>',
        url: "https://gemini.google.com/app",
    });
    const hostEl = res.doc.getElementById("code-block-host") as unknown as HTMLElement;
    return {
        ...res,
        hostEl,
    };
}

Deno.test("integration: Gemini: AST settleContent caches Org document AST", async () => {
    defaultAstCache.clear();
    const rawOrg = "* Project Planning\n| Task | Status |\n|---+---|\n| AST | DONE |";
    const hash = computeContentHash(rawOrg, "org");
    await defaultParserRegistry.settleContent<OrgDocumentElement>(rawOrg, "org");
    assertEquals(defaultAstCache.has(hash, "org"), true);
});

Deno.test("integration: GeminiInjector: injects Org block and caches AST", async () => {
    const { hostEl, cleanup } = setupGeminiDom();
    defaultAstCache.clear();
    try {
        const injector = new GeminiInjector();
        const rawOrg = "* Welcome to Org Mode\nParagraph text.";
        const hash = computeContentHash(rawOrg, "org");
        const blockRef: GeminiCodeBlockRef = {
            id: "test-block-1",
            hostElement: hostEl,
            rawText: rawOrg,
            languageHint: "org",
            codeContentElement: hostEl,
            isSettled: true,
        };
        await defaultParserRegistry.settleContent(rawOrg, "org");
        injector.inject(blockRef, "light");
        assertEquals(defaultAstCache.has(hash, "org"), true);
        injector.destroyAll();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiInjector: re-injecting block reuses cached AST", async () => {
    const { hostEl, cleanup } = setupGeminiDom();
    defaultAstCache.clear();
    try {
        const injector = new GeminiInjector();
        const rawOrg = "* Welcome to Org Mode\nParagraph text.";
        const hash = computeContentHash(rawOrg, "org");
        const blockRef: GeminiCodeBlockRef = {
            id: "test-block-1",
            hostElement: hostEl,
            rawText: rawOrg,
            languageHint: "org",
            codeContentElement: hostEl,
            isSettled: true,
        };
        await defaultParserRegistry.settleContent(rawOrg, "org");
        injector.inject(blockRef, "light");
        const cachedAst = defaultAstCache.get<OrgDocumentElement>(hash, "org");
        injector.destroyAll();

        const blockRef2: GeminiCodeBlockRef = {
            id: "test-block-2",
            hostElement: hostEl,
            rawText: rawOrg,
            languageHint: "org",
            codeContentElement: hostEl,
            isSettled: true,
        };
        injector.inject(blockRef2, "dark");
        const reCached = defaultAstCache.get<OrgDocumentElement>(hash, "org");
        assertEquals(reCached, cachedAst);
        injector.destroyAll();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiInjector: non-org block does not populate Org AST cache", () => {
    const { hostEl, cleanup } = setupGeminiDom();
    defaultAstCache.clear();
    try {
        const injector = new GeminiInjector();
        const rawPython = "def compute():\n    return 42";
        const hash = computeContentHash(rawPython, "python");
        const blockRef: GeminiCodeBlockRef = {
            id: "test-python-block",
            hostElement: hostEl,
            rawText: rawPython,
            languageHint: "python",
            codeContentElement: hostEl,
            isSettled: true,
        };
        injector.inject(blockRef, "light");
        assertFalse(defaultAstCache.has(hash, "org"));
        injector.destroyAll();
    } finally {
        cleanup();
    }
});

Deno.test("integration: GeminiInjector: non-destructive bypass leaves host visible for non-org code", () => {
    const { hostEl, cleanup } = setupGeminiDom();
    defaultAstCache.clear();
    try {
        const injector = new GeminiInjector();
        const rawPython = "def compute():\n    return 42";
        const blockRef: GeminiCodeBlockRef = {
            id: "test-python-block",
            hostElement: hostEl,
            rawText: rawPython,
            languageHint: "python",
            codeContentElement: hostEl,
            isSettled: true,
        };
        injector.inject(blockRef, "light");
        assertEquals(blockRef.siblingContainer, undefined);
        injector.destroyAll();
    } finally {
        cleanup();
    }
});
