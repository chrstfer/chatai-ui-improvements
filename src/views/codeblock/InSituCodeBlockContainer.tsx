import type { ComponentChildren, JSX } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { computeContentHash } from "../../core/utils/contentHash.ts";
import { copyTextToClipboard } from "../../core/utils/clipboard.ts";
import { defaultViewStateCache, type ViewMode, type ViewStateCache } from "../../store/viewStateCache.ts";
import { type AstCache, defaultAstCache } from "../../store/astCache.ts";
import { CodeBlockHeader } from "./CodeBlockHeader.tsx";
import { RawSourceView } from "./RawSourceView.tsx";
import { DocumentViewDispatcher } from "./DocumentViewDispatcher.tsx";

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
    /** Pre-parsed or cached AST for rich document views */
    ast?: unknown;
    /** Optional AST cache instance */
    astCache?: AstCache;
    /** Active host theme ('light' | 'dark') */
    theme?: "light" | "dark";
    /** Rendered view projection slot when viewMode === "rendered" */
    children?: ComponentChildren;
}

/**
 * Root In-Situ Code Block Container mounted directly inside the sibling Shadow Root.
 * Replaces the host code block with an enhanced toolbar, folding, view toggling,
 * host copy parity, and 0ms state hydration.
 * Styled via Tailwind CSS v4 utilities with unstyled semantic class hooks.
 */
export function InSituCodeBlockContainer({
    rawText,
    language,
    hasRenderedView = false,
    hostElement = null,
    cache = defaultViewStateCache,
    ast: _ast,
    astCache: _astCache = defaultAstCache,
    theme = "light",
    children,
}: InSituCodeBlockContainerProps): JSX.Element {
    const hash = useMemo(() => computeContentHash(rawText, language), [rawText, language]);
    const cachedState = useMemo(() => cache.get(hash), [cache, hash]);

    const [isFolded, setIsFolded] = useState<boolean>(cachedState?.isFolded ?? false);
    const [viewMode, setViewMode] = useState<ViewMode>(
        cachedState?.viewMode ?? (hasRenderedView ? "rendered" : "raw"),
    );
    const [documentViewState, setDocumentViewState] = useState<unknown>(
        cachedState?.documentViewState,
    );
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Synchronize view state mutations into the decoupled cache
    useEffect(() => {
        cache.set(hash, { isFolded, viewMode, documentViewState });
    }, [cache, hash, isFolded, viewMode, documentViewState]);

    const handleToggleFold = useCallback(() => {
        setIsFolded((prev) => !prev);
    }, []);

    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === "rendered" ? "raw" : "rendered"));
    }, []);

    const handleSaveViewState = useCallback((newDocState: unknown) => {
        setDocumentViewState(newDocState);
        cache.set(hash, {
            isFolded,
            viewMode,
            documentViewState: newDocState,
        });
    }, [cache, hash, isFolded, viewMode]);

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
        <div
            class={`ext-codeblock-container rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1e1f20] overflow-hidden text-neutral-900 dark:text-neutral-100 transition-colors duration-200 ${
                isFolded ? "is-folded" : ""
            }`}
            data-theme={theme}
        >
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
                <div class="ext-codeblock-body relative w-full">
                    {viewMode === "rendered" && hasRenderedView
                        ? (
                            children || (
                                <DocumentViewDispatcher
                                    language={language}
                                    rawText={rawText}
                                    documentViewState={documentViewState}
                                    onSaveViewState={handleSaveViewState}
                                />
                            )
                        )
                        : <RawSourceView rawText={rawText} language={language} />}
                </div>
            )}
        </div>
    );
}
