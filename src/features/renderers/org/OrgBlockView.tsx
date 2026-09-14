import type { JSX } from "preact";
import { useCallback, useState } from "preact/hooks";
import type {
    OrgBlockElement,
    OrgDynamicBlockElement,
    OrgFixedWidthElement,
    OrgObject,
} from "../../parsers/org/index.ts";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";

export interface OrgBlockViewProps {
    readonly block: OrgBlockElement | OrgDynamicBlockElement | OrgFixedWidthElement;
    readonly blockId: string;
    readonly isFolded?: boolean;
    readonly onToggleFold?: (blockId: string) => void;
    readonly onNavigateInternal?: (targetId: string) => void;
}

export function OrgBlockView({
    block,
    blockId,
    isFolded = false,
    onToggleFold,
    onNavigateInternal,
}: OrgBlockViewProps): JSX.Element {
    const [isCopied, setIsCopied] = useState(false);

    const blockType = "blockType" in block
        ? block.blockType.toUpperCase()
        : block.type === "dynamic_block"
        ? "DYNAMIC"
        : "FIXED_WIDTH";

    const language = "language" in block && block.language ? block.language.toUpperCase() : undefined;
    const name = "name" in block ? block.name : undefined;
    const caption = "caption" in block ? (block.caption as OrgObject[] | undefined) : undefined;
    const value = block.value;

    const lineCount = value.split("\n").length;
    const lineCountLabel = `${lineCount} ${lineCount === 1 ? "line" : "lines"}`;

    const handleCopy = useCallback(async (e: MouseEvent) => {
        e.stopPropagation();
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }
        } catch {
            /* Gracefully handle clipboard errors in tests/unfocused documents */
        }
    }, [value]);

    return (
        <section class="org-block-container my-3 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/5 dark:bg-neutral-950/40">
            {caption && (
                <div class="org-caption px-3 pt-2 pb-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                    <span class="font-semibold text-neutral-600 dark:text-neutral-300">Caption:</span>
                    <OrgObjectRenderer objects={caption} onNavigateInternal={onNavigateInternal} />
                </div>
            )}
            <header
                class="flex items-center justify-between px-3 py-1.5 bg-neutral-200/80 dark:bg-neutral-800/80 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer select-none border-b border-neutral-200 dark:border-neutral-800 transition-colors"
                onClick={() => onToggleFold?.(blockId)}
                aria-expanded={!isFolded}
            >
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="text-neutral-500 dark:text-neutral-400 font-mono text-[11px] select-none">
                        {isFolded ? "▶" : "▼"}
                    </span>
                    <span class="font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded bg-neutral-300/80 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                        {language ? `${blockType}: ${language}` : blockType}
                    </span>
                    {name && (
                        <span
                            class="org-block-name font-mono text-[11px] text-neutral-500 dark:text-neutral-400 truncate"
                            title={`#+NAME: ${name}`}
                        >
                            #{name}
                        </span>
                    )}
                </div>

                <div class="flex items-center gap-2 shrink-0 ml-2">
                    <span class="org-line-count font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                        {lineCountLabel}
                    </span>
                    <button
                        type="button"
                        onClick={handleCopy}
                        class="org-btn-copy px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                        title="Copy block content"
                    >
                        {isCopied ? "Copied!" : "Copy"}
                    </button>
                </div>
            </header>

            {!isFolded && (
                <pre class="org-block-body p-3 bg-neutral-900 text-neutral-100 dark:bg-neutral-950 font-mono text-xs overflow-x-auto m-0 leading-normal">
                    <code>{value}</code>
                </pre>
            )}
        </section>
    );
}
