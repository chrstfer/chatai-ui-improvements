/**
 * Pluggable Org Mode Language Definition.
 * Implements the LanguageDefinition contract, providing language detection,
 * AST parsing integration, and dynamic view component resolution.
 */

import type { LanguageDefinition } from "../../core/contracts/language.ts";
import type { DocumentViewComponent } from "../../core/contracts/documentView.ts";
import type { OrgDocumentElement } from "./ast/types.ts";
import { parseOrgDocument } from "./ast/parser.ts";
import { OrgDocumentView } from "./views/OrgDocumentView.tsx";

export class OrgLanguageDefinition implements LanguageDefinition {
    readonly id = "org";
    readonly name = "Org Mode";
    readonly aliases: readonly string[] = ["org", "orgmode", "org-mode"];

    /**
     * Multi-signal detector evaluating whether this module handles the content.
     * Evaluates explicit language hints and fallback regex heuristics on the first lines.
     */
    matches(languageHint: string, firstLines: readonly string[] = []): boolean {
        const hint = languageHint.trim().toLowerCase();
        if (this.aliases.includes(hint)) {
            return true;
        }

        // Fallback regex heuristic inspecting up to the first 10 non-empty lines
        for (const line of firstLines.slice(0, 10)) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;

            // Headline starting with 1 to 6 stars
            if (/^\*{1,6}\s+/.test(trimmed)) {
                return true;
            }
            // Standard document-level keywords
            if (/^#\+(?:title|author|date|options|tags):/i.test(trimmed)) {
                return true;
            }
            // Standard Org block beginnings
            if (/^#\+begin_/i.test(trimmed)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Headless parsing of raw Org-mode text into a canonical OrgDocumentElement AST.
     */
    parse(rawText: string): OrgDocumentElement {
        return parseOrgDocument(rawText);
    }

    readonly view: DocumentViewComponent = OrgDocumentView;
}

/** Global default Org language definition singleton */
export const orgLanguageDefinition = new OrgLanguageDefinition();
