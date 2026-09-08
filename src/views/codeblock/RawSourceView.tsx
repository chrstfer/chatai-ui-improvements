import type { JSX } from "preact";

export interface RawSourceViewProps {
    rawText: string;
    language?: string;
}

/**
 * Renders the pristine raw source of a code block inside the Shadow Root.
 */
export function RawSourceView({ rawText, language }: RawSourceViewProps): JSX.Element {
    return (
        <div class="ext-raw-code-wrapper">
            <pre class="ext-raw-code">
                <code data-language={language}>{rawText}</code>
            </pre>
        </div>
    );
}
