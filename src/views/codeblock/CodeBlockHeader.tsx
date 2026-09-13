import type { JSX } from "preact";
import type { ViewMode } from "../../store/viewStateCache.ts";
import { CheckmarkIcon, CopyIcon, ViewToggleIcon } from "./icons.tsx";
import { formatDisplayName } from "../../features/matchers/index.ts";

export interface CodeBlockHeaderProps {
    language: string;
    isFolded: boolean;
    rootFoldState?: "folded" | "children" | "subtree";
    viewMode: ViewMode;
    hasRenderedView: boolean;
    isCopied: boolean;
    onToggleFold?: () => void;
    onCycleFold?: () => void;
    onToggleCollapse?: () => void;
    onToggleViewMode: () => void;
    onCopy: () => void;
}

function formatLanguage(lang: string): string {
    return formatDisplayName(lang);
}

/**
 * Top toolbar for the enhanced code block, containing the fold toggle, language badge,
 * dynamic view toggle (rendered vs raw), and copy parity button.
 * Styled with Tailwind CSS v4 utilities and unstyled semantic class hooks.
 */
export function CodeBlockHeader({
    language,
    isFolded,
    rootFoldState,
    viewMode,
    hasRenderedView,
    isCopied,
    onToggleFold,
    onCycleFold,
    onToggleCollapse,
    onToggleViewMode,
    onCopy,
}: CodeBlockHeaderProps): JSX.Element {
    const handleFoldCycle = onCycleFold ?? onToggleFold;
    const handleCollapseToggle = onToggleCollapse ?? onToggleFold;

    const handleHeaderClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("button, a, input")) {
            return;
        }
        handleFoldCycle?.();
    };

    const foldGlyph = isFolded ? "▶" : rootFoldState === "children" ? "▷" : "▼";

    const headerTitle = hasRenderedView
        ? (isFolded
            ? "Click to show outline overview"
            : rootFoldState === "children"
            ? "Click to expand entire subtree"
            : "Click to collapse code block")
        : (isFolded ? "Click to expand code block" : "Click to collapse code block");

    return (
        <header
            class={`ext-header flex items-center justify-between px-3 py-2 bg-neutral-100 dark:bg-[#131314] select-none transition-colors duration-200 cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-neutral-800/40 ${
                isFolded ? "border-b-0" : "border-b border-neutral-200 dark:border-neutral-700"
            }`}
            onClick={handleHeaderClick}
            title={headerTitle}
        >
            <div class="ext-header-left flex items-center gap-2">
                <button
                    class="ext-btn ext-btn-icon ext-btn-fold inline-flex items-center justify-center p-1 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent font-mono text-xs select-none"
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleFoldCycle?.();
                    }}
                    aria-label={headerTitle}
                    title={headerTitle}
                >
                    {foldGlyph}
                </button>
                <span class="ext-language-badge inline-block text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300 leading-normal">
                    {formatLanguage(language)}
                </span>
            </div>

            <div class="ext-header-actions flex items-center gap-1.5">
                {hasRenderedView && (
                    <button
                        class={`ext-btn ext-btn-view-toggle inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent ${
                            viewMode === "rendered" ? "is-rendered" : "is-raw"
                        }`}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleViewMode();
                        }}
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
                    class="ext-btn ext-btn-collapse inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCollapseToggle?.();
                    }}
                    aria-label={isFolded ? "Expand code block" : "Collapse code block"}
                    title={isFolded ? "Expand code block" : "Collapse code block"}
                >
                    {isFolded ? "+" : "−"}
                </button>

                <button
                    class={`ext-btn ext-btn-copy inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent ${
                        isCopied
                            ? "is-copied text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopy();
                    }}
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
