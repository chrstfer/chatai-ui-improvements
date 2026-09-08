import type { JSX } from "preact";
import type { ViewMode } from "../../store/viewStateCache.ts";
import { CheckmarkIcon, ChevronIcon, CopyIcon, ViewToggleIcon } from "./icons.tsx";

export interface CodeBlockHeaderProps {
    language: string;
    isFolded: boolean;
    viewMode: ViewMode;
    hasRenderedView: boolean;
    isCopied: boolean;
    onToggleFold: () => void;
    onToggleViewMode: () => void;
    onCopy: () => void;
}

import { defaultLanguageRegistry } from "../../languages/registry.ts";

function formatLanguage(lang: string): string {
    return defaultLanguageRegistry.formatDisplayName(lang);
}

/**
 * Top toolbar for the enhanced code block, containing the fold toggle, language badge,
 * dynamic view toggle (rendered vs raw), and copy parity button.
 */
export function CodeBlockHeader({
    language,
    isFolded,
    viewMode,
    hasRenderedView,
    isCopied,
    onToggleFold,
    onToggleViewMode,
    onCopy,
}: CodeBlockHeaderProps): JSX.Element {
    return (
        <header class="ext-header">
            <div class="ext-header-left">
                <button
                    class="ext-btn ext-btn-icon ext-btn-fold"
                    type="button"
                    onClick={onToggleFold}
                    aria-label={isFolded ? "Expand code block" : "Collapse code block"}
                    title={isFolded ? "Expand" : "Collapse"}
                >
                    <ChevronIcon isFolded={isFolded} />
                </button>
                <span class="ext-language-badge">
                    {formatLanguage(language)}
                </span>
            </div>

            <div class="ext-header-actions">
                {hasRenderedView && (
                    <button
                        class={`ext-btn ext-btn-view-toggle ${viewMode === "rendered" ? "is-rendered" : "is-raw"}`}
                        type="button"
                        onClick={onToggleViewMode}
                        aria-label={viewMode === "rendered" ? "Switch to raw code" : "Switch to rendered view"}
                        title={viewMode === "rendered" ? "Switch to raw code" : "Switch to rendered view"}
                    >
                        <ViewToggleIcon viewMode={viewMode} />
                        <span class="ext-btn-label">
                            {viewMode === "rendered" ? "Raw" : "Rendered"}
                        </span>
                    </button>
                )}

                <button
                    class={`ext-btn ext-btn-copy ${isCopied ? "is-copied" : ""}`}
                    type="button"
                    onClick={onCopy}
                    aria-label={isCopied ? "Copied to clipboard" : "Copy code"}
                    title={isCopied ? "Copied!" : "Copy code"}
                >
                    {isCopied ? <CheckmarkIcon /> : <CopyIcon />}
                    <span class="ext-btn-label">
                        {isCopied ? "Copied!" : "Copy"}
                    </span>
                </button>
            </div>
        </header>
    );
}
