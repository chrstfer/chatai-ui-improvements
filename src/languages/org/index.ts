/**
 * Standalone Org-Mode Parsing & Preact Rendering Library
 * Completely decoupled from Gemini / extension DOM logic for universal reusability.
 */

import { h, render } from "preact";
import { OrgDocumentView } from "./components/OrgDocumentView.tsx";
import { parseOrgDocument, serializeOrgDocument, serializeOrgSection } from "./parser/document-parser.ts";
import { isOrgContent } from "./parser/detector.ts";
import { OrgDocument } from "./types/ast.ts";

export * from "./parser/document-parser.ts";
export * from "./parser/detector.ts";
export * from "./parser/inline-lexer.ts";
export * from "./parser/latex.ts";
export * from "./types/ast.ts";
export * from "./export/index.ts";
export { OrgDocumentView };
export {
    DEFAULT_TOOLBAR_TOOLS,
    globalToolbarRegistry,
    OrgToolbar,
    type ToolbarContext,
    type ToolbarTool,
    ToolbarToolRegistry,
} from "./components/OrgToolbar.tsx";

/**
 * High-level helper to parse and mount an Org document into any target DOM container.
 */
export function renderOrgToDOM(
    rawText: string,
    container: HTMLElement,
    forceFoldAll?: boolean,
): OrgDocument {
    const doc = parseOrgDocument(rawText);
    render(
        h(OrgDocumentView, { doc, forceFoldAll }),
        container,
    );
    return doc;
}

/**
 * Facade for parsing and validation
 */
export const OrgEngine = {
    parse: parseOrgDocument,
    isOrgContent,
    renderToDOM: renderOrgToDOM,
    serializeSection: serializeOrgSection,
    serializeDocument: serializeOrgDocument,
};

// Aliased as OrgParser for seamless migration
export const OrgParser = OrgEngine;
