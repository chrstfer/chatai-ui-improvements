import type { JSX } from "preact";

export interface RawSourceViewProps {
    rawText: string;
    language?: string;
}

/**
 * Renders the pristine raw source of a code block inside the Shadow Root.
 * Styled with Tailwind utility classes and unstyled semantic hooks.
 */
export function RawSourceView({ rawText, language }: RawSourceViewProps): JSX.Element {
    return (
        <div class="ext-raw-code-wrapper overflow-x-auto">
            <pre class="ext-raw-code m-0 p-3.5 font-mono text-[13px] leading-relaxed bg-neutral-50 dark:bg-[#1e1f20] text-neutral-900 dark:text-neutral-200 whitespace-pre">
                <code data-language={language}>{rawText}</code>
            </pre>
        </div>
    );
}
