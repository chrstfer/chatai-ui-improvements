import type { ComponentChildren, JSX } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { computeContentHash } from "../../core/utils/contentHash.ts";
import { copyTextToClipboard } from "../../core/utils/clipboard.ts";
import { defaultViewStateCache, type ViewMode, type ViewStateCache } from "../../store/viewStateCache.ts";
import { CodeBlockHeader } from "./CodeBlockHeader.tsx";
import { RawSourceView } from "./RawSourceView.tsx";

export interface InSituCodeBlockContainerProps {
    /** Pristine raw code text from the host Data-Island */
    rawText: string;
    /** Detected or hinted programming/markup language */
    language: string;
    /** Whether this block supports a rich rendered view (e.g. Org-mode document) */
    hasRenderedView?: boolean;
    /** Native host element reference for clipboard fallback invocation */
    hostElement?: HTMLElement | null;
    /** Optional cache instance for testing or decoupled lifecycle persistence */
    cache?: ViewStateCache;
    /** Rendered view projection slot when viewMode === "rendered" */
    children?: ComponentChildren;
}

/**
 * Root In-Situ Code Block Container mounted directly inside the sibling Shadow Root.
 * Replaces the host code block with an enhanced toolbar, folding, view toggling,
 * and host copy parity.
 */
export function InSituCodeBlockContainer({
    rawText,
    language,
    hasRenderedView = false,
    hostElement = null,
    cache = defaultViewStateCache,
    children,
}: InSituCodeBlockContainerProps): JSX.Element {
    const hash = useMemo(() => computeContentHash(rawText, language), [rawText, language]);
    const cachedState = useMemo(() => cache.get(hash), [cache, hash]);

    const [isFolded, setIsFolded] = useState<boolean>(cachedState?.isFolded ?? false);
    const [viewMode, setViewMode] = useState<ViewMode>(
        cachedState?.viewMode ?? (hasRenderedView ? "rendered" : "raw"),
    );
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Synchronize view state mutations into the decoupled cache
    useEffect(() => {
        cache.set(hash, { isFolded, viewMode });
    }, [cache, hash, isFolded, viewMode]);

    const handleToggleFold = useCallback(() => {
        setIsFolded((prev) => !prev);
    }, []);

    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === "rendered" ? "raw" : "rendered"));
    }, []);

    const handleCopy = useCallback(async () => {
        const success = await copyTextToClipboard(rawText, {
            enableHostFallback: true,
            hostFallbackElement: hostElement,
        });
        if (success) {
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }
    }, [rawText, hostElement]);

    return (
        <div class={`ext-codeblock-container ${isFolded ? "is-folded" : ""}`}>
            <CodeBlockHeader
                language={language}
                isFolded={isFolded}
                viewMode={viewMode}
                hasRenderedView={hasRenderedView}
                isCopied={isCopied}
                onToggleFold={handleToggleFold}
                onToggleViewMode={handleToggleViewMode}
                onCopy={handleCopy}
            />
            {!isFolded && (
                <div class="ext-codeblock-body">
                    {viewMode === "rendered" && hasRenderedView
                        ? (
                            children || (
                                <div class="ext-rendered-placeholder">
                                    <span class="ext-placeholder-text">
                                        Rendered view will appear here in Phase 2 Stage 2.
                                    </span>
                                </div>
                            )
                        )
                        : <RawSourceView rawText={rawText} language={language} />}
                </div>
            )}
        </div>
    );
}
