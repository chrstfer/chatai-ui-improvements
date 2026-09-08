import type { JSX } from "preact";
import type { DocumentViewProps } from "../../../core/contracts/documentView.ts";
import { DiagnosticPlaceholderBlock } from "../../../views/common/DiagnosticPlaceholderBlock.tsx";

/**
 * Temporary bridge view projecting DocumentViewProps to DiagnosticPlaceholderBlock
 * until Phase 2 Stage 3 implements the full in-situ OrgDocumentView.
 */
export function OrgPlaceholderView(props: DocumentViewProps): JSX.Element {
    return (
        <DiagnosticPlaceholderBlock
            adapterName="Gemini"
            language={props.language}
            rawText={props.content}
        />
    );
}
