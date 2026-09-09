import { assertEquals, assertExists, assertFalse } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { GeminiInjector } from "../../src/chat/gemini/injector.tsx";
import type { GeminiCodeBlockRef } from "../../src/chat/gemini/types.ts";
import { defaultLanguageRegistry } from "../../src/languages/registry.ts";
import { defaultAstCache } from "../../src/store/astCache.ts";
import { computeContentHash } from "../../src/core/utils/contentHash.ts";
import type { OrgDocumentElement } from "../../src/languages/org/ast/types.ts";

function setupDom() {
    const doc = new DOMParser().parseFromString(
        '<!DOCTYPE html><html><body><div id="turn-container"><div id="code-block-host" style="display: block;"></div></div></body></html>',
        "text/html",
    );
    if (!doc) throw new Error("Failed to create mock DOM");

    interface GlobalDomScope {
        document?: unknown;
        Node?: unknown;
    }
    const scope = globalThis as unknown as GlobalDomScope;
    const origDoc = scope.document;
    const origNode = scope.Node;

    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => {
        return doc.createElement(tag);
    };

    // Shim attachShadow and style for deno-dom mock environment
    const hostEl = doc.getElementById("code-block-host") as unknown as HTMLElement & {
        attachShadow?: (init: { mode: string }) => unknown;
    };
    (hostEl as unknown as { style: Record<string, string> }).style = {};
    const turnEl = doc.getElementById("turn-container") as unknown as HTMLElement;

    // Attach mock attachShadow and style to elements created by document.createElement
    const origCreateElement = doc.createElement.bind(doc);
    (doc as unknown as { createElement: (tag: string) => unknown }).createElement = (tag: string) => {
        const el = origCreateElement(tag) as unknown as HTMLElement & {
            attachShadow: (init: { mode: string }) => unknown;
        };
        (el as unknown as { style: Record<string, string> }).style = {};
        el.attachShadow = () => {
            const shadow = doc.createElement("div") as unknown as ShadowRoot;
            (el as unknown as { shadowRoot: unknown }).shadowRoot = shadow;
            return shadow;
        };
        return el;
    };

    scope.document = doc;
    scope.Node = doc.body.constructor;

    return {
        doc,
        turnEl,
        hostEl,
        cleanup: () => {
            render(null, turnEl);
            scope.document = origDoc;
            scope.Node = origNode;
        },
    };
}

Deno.test("LanguageRegistry.settleContent: Parses and caches Org block AST", async () => {
    defaultAstCache.clear();
    await defaultLanguageRegistry.loadLanguage("org");

    const rawOrg = [
        "* Project Planning",
        "#+NAME: task_table",
        "| Task | Status |",
        "|------+--------|",
        "| AST  | DONE   |",
    ].join("\n");

    const hash = computeContentHash(rawOrg, "org");
    assertFalse(defaultAstCache.has(hash, "org"));

    // First settlement: cache miss, parses AST
    const { langDef, hash: returnedHash, ast } = defaultLanguageRegistry.settleContent<OrgDocumentElement>(
        rawOrg,
        "org",
    );

    assertEquals(langDef?.id, "org");
    assertEquals(returnedHash, hash);
    assertExists(ast);
    assertEquals(ast.type, "document");
    assertEquals(ast.children.length, 1);
    assertEquals(ast.children[0].type, "headline");

    // Cache should now have entry
    assertEquals(defaultAstCache.has(hash, "org"), true);

    // Second settlement: cache hit, returns same parsed instance
    const cachedResult = defaultLanguageRegistry.settleContent<OrgDocumentElement>(
        rawOrg,
        "org",
    );
    assertEquals(cachedResult.ast, ast);
});

Deno.test("GeminiInjector: Injects Org block, populates AstCache, and supports 0ms recycling", async () => {
    const { hostEl, cleanup } = setupDom();
    defaultAstCache.clear();
    await defaultLanguageRegistry.loadLanguage("org");

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

        // 1. Initial injection
        injector.inject(blockRef, "light");

        // AST cache should now be populated
        assertEquals(defaultAstCache.has(hash, "org"), true);
        const cachedAst = defaultAstCache.get<OrgDocumentElement>(hash, "org");
        assertExists(cachedAst);
        assertEquals(cachedAst.title, undefined);
        assertEquals(cachedAst.children.length, 1);

        // 2. Destroy and simulate virtual scroller recycling (re-mounting same block)
        injector.destroyAll();

        const blockRef2: GeminiCodeBlockRef = {
            id: "test-block-2",
            hostElement: hostEl,
            rawText: rawOrg,
            languageHint: "org",
            codeContentElement: hostEl,
            isSettled: true,
        };

        // Re-inject block: should retrieve from cache without re-parsing
        injector.inject(blockRef2, "dark");

        const reCached = defaultAstCache.get<OrgDocumentElement>(hash, "org");
        assertEquals(reCached, cachedAst);

        injector.destroyAll();
    } finally {
        cleanup();
    }
});

Deno.test("GeminiInjector: Non-org language does not populate Org AST cache", () => {
    const { hostEl, cleanup } = setupDom();
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

        // Non-Destructive Host Bypass: host element is NOT hidden and no sibling container is created
        assertEquals((hostEl as unknown as { style: { display?: string } }).style.display, undefined);
        assertEquals(blockRef.siblingContainer, undefined);
        assertEquals(hostEl.parentElement?.children.length, 1);

        assertFalse(defaultAstCache.has(hash, "python"));
        assertFalse(defaultAstCache.has(hash, "org"));

        injector.destroyAll();
    } finally {
        cleanup();
    }
});
