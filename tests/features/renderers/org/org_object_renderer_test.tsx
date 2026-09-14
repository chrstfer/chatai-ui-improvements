import { assertEquals } from "@std/assert";
import { cleanup as cleanupRtl, render } from "@testing-library/preact";
import { setupTestDom } from "../../../fixtures/dom_fixture.ts";
import { OrgObjectRenderer } from "../../../../src/features/renderers/org/OrgObjectRenderer.tsx";
import { parseOrgInline } from "../../../../src/features/parsers/org/index.ts";

Deno.test("unit: OrgObjectRenderer: renders bold elements", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Normal *bold* text");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const boldEl = container.querySelector("strong.org-bold");
        assertEquals(boldEl?.textContent?.trim(), "bold");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders italic elements", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Normal /italic/ text");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const italicEl = container.querySelector("em.org-italic");
        assertEquals(italicEl?.textContent?.trim(), "italic");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders underline elements", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Normal _underline_ text");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const underlineEl = container.querySelector("u.org-underline");
        assertEquals(underlineEl?.textContent?.trim(), "underline");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders strike elements", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Normal +strike+ text");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const strikeEl = container.querySelector("del.org-strike");
        assertEquals(strikeEl?.textContent?.trim(), "strike");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders inline code elements", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Normal ~code~ text");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const codeEl = container.querySelector("code.org-inline-code");
        assertEquals(codeEl?.textContent?.trim(), "code");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders inline verbatim elements", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Normal =verbatim= text");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const verbatimEl = container.querySelector("code.org-inline-verbatim");
        assertEquals(verbatimEl?.textContent?.trim(), "verbatim");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders external links with target blank", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("[[https://example.com][Example Site]]");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const extLink = container.querySelector("a.org-link");
        assertEquals(extLink?.getAttribute("target"), "_blank");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: routes image extension links to InlineImageView", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("[[https://example.com/logo.png][Logo Preview]]");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const imgFigure = container.querySelector("figure.inline-image-container");
        assertEquals(imgFigure !== null, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: dispatches onNavigateInternal on internal headline link click", () => {
    const { cleanup } = setupTestDom();
    try {
        let navigatedTarget = "";
        const parsed = parseOrgInline("[[*Target Headline][Jump to Headline]]");
        const { container } = render(
            <OrgObjectRenderer
                objects={parsed}
                onNavigateInternal={(target) => {
                    navigatedTarget = target;
                }}
            />,
        );
        const internalBtn = container.querySelector("button.org-internal-link");
        internalBtn?.dispatchEvent(new Event("click", { bubbles: true }));
        assertEquals(navigatedTarget, "Target Headline");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders LaTeX math fragments", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Energy equation: $E = mc^2$");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const mathEl = container.querySelector(".latex-math");
        assertEquals(mathEl !== null, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders Greek entity symbols", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Symbol \\alpha");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const entityEl = container.querySelector("span.org-entity");
        assertEquals(entityEl?.textContent?.includes("α"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders macro definitions", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Macro {{{version(2.0)}}}");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const macroEl = container.querySelector("span.org-macro");
        assertEquals(macroEl?.textContent?.includes("version"), true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders statistics cookie pills", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Cookie [2/5]");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const cookieEl = container.querySelector("span.org-cookie");
        assertEquals(cookieEl?.textContent?.trim(), "[2/5]");
    } finally {
        cleanupRtl();
        cleanup();
    }
});

Deno.test("unit: OrgObjectRenderer: renders forced line breaks", () => {
    const { cleanup } = setupTestDom();
    try {
        const parsed = parseOrgInline("Break \\\\ next");
        const { container } = render(<OrgObjectRenderer objects={parsed} />);
        const brEl = container.querySelector("br.org-line-break");
        assertEquals(brEl !== null, true);
    } finally {
        cleanupRtl();
        cleanup();
    }
});
