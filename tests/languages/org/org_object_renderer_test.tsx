import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser } from "@b-fuze/deno-dom";
import { render } from "preact";
import { OrgObjectRenderer } from "../../../src/languages/org/views/OrgObjectRenderer.tsx";
import { parseOrgInline } from "../../../src/languages/org/ast/inlineParser.ts";

function setupDom() {
    const doc = new DOMParser().parseFromString(
        '<!DOCTYPE html><html><body><div id="mount-point"></div></body></html>',
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

    const origCreateElement = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
        const el = origCreateElement(tag);
        (el as unknown as { style: Record<string, string> }).style = {};
        return el;
    };

    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => {
        const el = doc.createElement(tag);
        return el;
    };

    scope.document = doc;
    scope.Node = doc.body.constructor;

    const root = doc.getElementById("mount-point") as unknown as HTMLElement;

    return {
        doc,
        root,
        cleanup: () => {
            render(null, root);
            scope.document = origDoc;
            scope.Node = origNode;
        },
    };
}

function triggerClick(el: unknown) {
    if (el && typeof (el as { dispatchEvent?: unknown }).dispatchEvent === "function") {
        (el as { dispatchEvent: (ev: Event) => void }).dispatchEvent(
            new Event("click", { bubbles: true }),
        );
    }
}

Deno.test("OrgObjectRenderer: Renders text formatting (bold, italic, underline, strike, code, verbatim)", () => {
    const { root, cleanup } = setupDom();
    try {
        const parsed = parseOrgInline("Normal *bold* /italic/ _underline_ +strike+ ~code~ =verbatim=");
        render(<OrgObjectRenderer objects={parsed} />, root);

        const boldEl = root.querySelector("strong.org-bold");
        assertNotEquals(boldEl, null);
        assertEquals(boldEl?.textContent?.trim(), "bold");

        const italicEl = root.querySelector("em.org-italic");
        assertNotEquals(italicEl, null);
        assertEquals(italicEl?.textContent?.trim(), "italic");

        const underlineEl = root.querySelector("u.org-underline");
        assertNotEquals(underlineEl, null);
        assertEquals(underlineEl?.textContent?.trim(), "underline");

        const strikeEl = root.querySelector("del.org-strike");
        assertNotEquals(strikeEl, null);
        assertEquals(strikeEl?.textContent?.trim(), "strike");

        const codeEl = root.querySelector("code.org-inline-code");
        assertNotEquals(codeEl, null);
        assertEquals(codeEl?.textContent?.trim(), "code");

        const verbatimEl = root.querySelector("code.org-inline-verbatim");
        assertNotEquals(verbatimEl, null);
        assertEquals(verbatimEl?.textContent?.trim(), "verbatim");
    } finally {
        cleanup();
    }
});

Deno.test("OrgObjectRenderer: Renders external links and routes image URLs to InlineImageView", () => {
    const { root, cleanup } = setupDom();
    try {
        const parsed = parseOrgInline(
            "[[https://example.com][Example Site]] and [[https://example.com/logo.png][Logo Preview]]",
        );
        render(<OrgObjectRenderer objects={parsed} />, root);

        // Standard link
        const extLink = root.querySelector("a.org-link");
        assertNotEquals(extLink, null);
        assertEquals(extLink?.getAttribute("href"), "https://example.com");
        assertEquals(extLink?.getAttribute("target"), "_blank");
        assertEquals(extLink?.getAttribute("rel"), "noopener noreferrer");
        assertEquals(extLink?.textContent?.includes("Example Site"), true);

        // Image link routed to InlineImageView
        const imgFigure = root.querySelector("figure.inline-image-container");
        assertNotEquals(imgFigure, null, "Image extension link must render InlineImageView");
        const imgEl = imgFigure?.querySelector("img");
        assertNotEquals(imgEl, null);
        assertEquals(imgEl?.getAttribute("src"), "https://example.com/logo.png");
    } finally {
        cleanup();
    }
});

Deno.test("OrgObjectRenderer: Renders internal headline links and invokes onNavigateInternal", () => {
    const { root, cleanup } = setupDom();
    try {
        let navigatedTarget = "";
        const parsed = parseOrgInline("[[*Target Headline][Jump to Headline]]");
        render(
            <OrgObjectRenderer
                objects={parsed}
                onNavigateInternal={(target) => {
                    navigatedTarget = target;
                }}
            />,
            root,
        );

        const internalBtn = root.querySelector("button.org-internal-link");
        assertNotEquals(internalBtn, null);
        assertEquals(internalBtn?.textContent?.includes("Jump to Headline"), true);

        triggerClick(internalBtn);
        assertEquals(navigatedTarget, "Target Headline");
    } finally {
        cleanup();
    }
});

Deno.test("OrgObjectRenderer: Renders LaTeX fragments via LatexMathView", () => {
    const { root, cleanup } = setupDom();
    try {
        const parsed = parseOrgInline("Energy equation: $E = mc^2$");
        render(<OrgObjectRenderer objects={parsed} />, root);

        const mathEl = root.querySelector(".latex-math");
        assertNotEquals(mathEl, null, "Must render LatexMathView container");
        assertEquals(root.textContent?.includes("mc"), true);
    } finally {
        cleanup();
    }
});

Deno.test("OrgObjectRenderer: Renders entities, macros, statistics cookies, and line breaks", () => {
    const { root, cleanup } = setupDom();
    try {
        const parsed = parseOrgInline(
            "Symbol \\alpha macro {{{version(2.0)}}} cookie [2/5] break \\\\ end",
        );
        render(<OrgObjectRenderer objects={parsed} />, root);

        const entityEl = root.querySelector("span.org-entity");
        assertNotEquals(entityEl, null);
        assertEquals(entityEl?.textContent?.includes("α"), true);

        const macroEl = root.querySelector("span.org-macro");
        assertNotEquals(macroEl, null);
        assertEquals(macroEl?.textContent?.includes("version"), true);

        const cookieEl = root.querySelector("span.org-cookie");
        assertNotEquals(cookieEl, null);
        assertEquals(cookieEl?.textContent?.trim(), "[2/5]");

        const brEl = root.querySelector("br.org-line-break");
        assertNotEquals(brEl, null);
    } finally {
        cleanup();
    }
});
