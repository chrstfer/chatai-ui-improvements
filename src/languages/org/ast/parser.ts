/**
 * Main entrypoint for parsing Org-mode documents into strongly typed ASTs.
 * 100% headless with zero DOM or external runtime dependencies.
 */

import type { OrgDocumentElement } from "./types.ts";
import { parseOrgBlocks } from "./blockParser.ts";

/**
 * Parses an Org-mode document string into an OrgDocumentElement AST.
 *
 * @param content The raw Org-mode document text.
 * @returns The fully constructed OrgDocumentElement root node.
 */
export function parseOrgDocument(content: string): OrgDocumentElement {
    return parseOrgBlocks(content);
}
