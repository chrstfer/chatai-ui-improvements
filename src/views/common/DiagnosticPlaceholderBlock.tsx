import type { JSX } from "preact";

export interface DiagnosticPlaceholderBlockProps {
    /** Chat provider name, e.g. "Gemini", "DuckAI". Defaults to "Gemini" */
    adapterName?: string;
    /** Detected programming language or format (e.g. "org", "python") */
    language: string;
    /** Raw text content from the data island */
    rawText: string;
}

export function DiagnosticPlaceholderBlock({
    adapterName = "Gemini",
    language,
    rawText,
}: DiagnosticPlaceholderBlockProps): JSX.Element {
    const lineCount = rawText.split("\n").length;
    const charCount = rawText.length;
    const preview = rawText.slice(0, 180);

    return (
        <div class="diagnostic-placeholder-block">
            <div class="diagnostic-placeholder-header">
                <span class="diagnostic-badge">{adapterName} Org-UI: {language}</span>
                <span class="diagnostic-metrics">{lineCount} lines &bull; {charCount} characters</span>
            </div>
            <pre class="diagnostic-preview">{preview}{charCount > 180 ? "..." : ""}</pre>
        </div>
    );
}
