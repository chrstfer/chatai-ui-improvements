import type { ComponentChildren, JSX } from "preact";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { computeContentHash } from "@internal/core/utils";
import { copyTextToClipboard } from "@internal/core/utils";
import { defaultViewStateCache, type ViewMode, type ViewStateCache } from "@internal/store";
import { type AstCache, defaultAstCache } from "@internal/store";
import { CodeBlockHeader } from "./CodeBlockHeader.tsx";
import { RawSourceView } from "./RawSourceView.tsx";
import { CodeBlockViewDispatcher } from "./CodeBlockViewDispatcher.tsx";

function findParentMessage(el: HTMLElement | null): HTMLElement | null {
    if (!el || typeof document === "undefined") return null;
    const root = el.getRootNode?.();
    const host = (root instanceof ShadowRoot) ? (root.host as HTMLElement) : el;
    return host?.closest<HTMLElement>(
        ".conversation-container, .response-container, [class*='conversation-container'], [class*='model-turn'], .model-turn, user-query",
    ) ?? host;
}

function findScrollContainer(el: HTMLElement | null): HTMLElement | Window {
    if (!el || typeof window === "undefined") return globalThis as unknown as Window;
    const root = el.getRootNode?.();
    const host = (root instanceof ShadowRoot) ? (root.host as HTMLElement) : el;
    let curr: HTMLElement | null = host;
    while (curr && curr !== document.body && curr !== document.documentElement) {
        if (typeof globalThis.getComputedStyle === "function") {
            const style = globalThis.getComputedStyle(curr);
            if (/(auto|scroll)/.test(style.overflowY)) {
                return curr;
            }
        }
        curr = curr.parentElement;
    }
    const geminiScroller = document.querySelector<HTMLElement>(
        "chat-window chat-window-content infinite-scroller, #chat-history, .infinite-scroller",
    );
    if (geminiScroller) return geminiScroller;
    return window;
}

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
    const containerRef = useRef<HTMLDivElement | null>(null);
    const scrollAnchorRef = useRef<{ msg: HTMLElement; initialTop: number } | null>(null);

    const hash = useMemo(() => computeContentHash(rawText, language), [rawText, language]);
    const cachedState = useMemo(() => cache.get(hash), [cache, hash]);

    const initialRootFoldState: "folded" | "children" | "subtree" = cachedState?.isFolded
        ? "folded"
        : ((cachedState?.documentViewState as { rootFoldState?: "folded" | "children" | "subtree" })?.rootFoldState ??
            "subtree");

    const [rootFoldState, setRootFoldState] = useState<"folded" | "children" | "subtree">(
        initialRootFoldState,
    );
    const [isFolded, setIsFolded] = useState<boolean>(
        cachedState?.isFolded ?? (initialRootFoldState === "folded"),
    );
    const [viewMode, setViewMode] = useState<ViewMode>(
        cachedState?.viewMode ?? (hasRenderedView ? "rendered" : "raw"),
    );
    const [documentViewState, setDocumentViewState] = useState<unknown>(
        cachedState?.documentViewState ?? (hasRenderedView ? { rootFoldState: initialRootFoldState } : undefined),
    );
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Capture the top of the parent message before folding/collapsing
    const captureScrollAnchor = useCallback(() => {
        if (typeof window === "undefined" || !containerRef.current) return;
        const msg = findParentMessage(containerRef.current);
        if (msg && typeof msg.getBoundingClientRect === "function") {
            scrollAnchorRef.current = {
                msg,
                initialTop: msg.getBoundingClientRect().top,
            };
        }
    }, []);

    // Ensure collapsing a block collapses upward by keeping the top of the message in place
    useLayoutEffect(() => {
        if (scrollAnchorRef.current) {
            const { msg, initialTop } = scrollAnchorRef.current;
            scrollAnchorRef.current = null;
            if (typeof document !== "undefined" && msg && typeof msg.getBoundingClientRect === "function") {
                const currentTop = msg.getBoundingClientRect().top;
                const delta = currentTop - initialTop;
                if (Math.abs(delta) > 0.5) {
                    const scroller = findScrollContainer(containerRef.current);
                    if (scroller && typeof (scroller as HTMLElement).scrollTop === "number") {
                        (scroller as HTMLElement).scrollTop += delta;
                    } else if (typeof window !== "undefined" && typeof globalThis.scrollBy === "function") {
                        globalThis.scrollBy(0, delta);
                    }
                }
            }
        }
    }, [isFolded, rootFoldState, viewMode, documentViewState]);

    // Synchronize view state mutations into the decoupled cache
    useEffect(() => {
        cache.set(hash, { isFolded, viewMode, documentViewState });
    }, [cache, hash, isFolded, viewMode, documentViewState]);

    const handleCycleFold = useCallback(() => {
        captureScrollAnchor();
        if (hasRenderedView) {
            // 3-state outline cycling on H0: subtree -> folded -> children -> subtree
            let nextRootFoldState: "folded" | "children" | "subtree";
            if (isFolded || rootFoldState === "folded") {
                // Click 2: Children overview
                nextRootFoldState = "children";
            } else if (rootFoldState === "children") {
                // Click 3: Subtree expanded
                nextRootFoldState = "subtree";
            } else {
                // Click 1 (from subtree / initial): Folds everything
                nextRootFoldState = "folded";
            }

            const nextIsFolded = nextRootFoldState === "folded";
            setRootFoldState(nextRootFoldState);
            setIsFolded(nextIsFolded);

            const nextDocState = {
                ...((documentViewState as Record<string, unknown>) || {}),
                rootFoldState: nextRootFoldState,
            };
            setDocumentViewState(nextDocState);
            cache.set(hash, {
                isFolded: nextIsFolded,
                viewMode,
                documentViewState: nextDocState,
            });
        } else {
            // 2-state folding for non-rendered code blocks (e.g. Python, JS)
            const nextIsFolded = !isFolded;
            setIsFolded(nextIsFolded);
            setRootFoldState(nextIsFolded ? "folded" : "subtree");
            cache.set(hash, {
                isFolded: nextIsFolded,
                viewMode,
                documentViewState,
            });
        }
    }, [hasRenderedView, isFolded, rootFoldState, documentViewState, cache, hash, viewMode, captureScrollAnchor]);

    const handleToggleCollapse = useCallback(() => {
        captureScrollAnchor();
        // Quick 2-state collapse/expand bypass
        const nextIsFolded = !isFolded;
        const nextRootFoldState = nextIsFolded ? "folded" : "subtree";
        setIsFolded(nextIsFolded);
        setRootFoldState(nextRootFoldState);

        const nextDocState = hasRenderedView
            ? {
                ...((documentViewState as Record<string, unknown>) || {}),
                rootFoldState: nextRootFoldState,
            }
            : documentViewState;
        setDocumentViewState(nextDocState);
        cache.set(hash, {
            isFolded: nextIsFolded,
            viewMode,
            documentViewState: nextDocState,
        });
    }, [isFolded, hasRenderedView, documentViewState, cache, hash, viewMode, captureScrollAnchor]);

    const handleToggleViewMode = useCallback(() => {
        setViewMode((prev) => (prev === "rendered" ? "raw" : "rendered"));
    }, []);

    const handleSaveViewState = useCallback((newDocState: unknown) => {
        captureScrollAnchor();
        setDocumentViewState(newDocState);
        cache.set(hash, {
            isFolded,
            viewMode,
            documentViewState: newDocState,
        });
    }, [cache, hash, isFolded, viewMode, captureScrollAnchor]);

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
            ref={containerRef}
            class={`ext-codeblock-container rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1e1f20] overflow-hidden text-neutral-900 dark:text-neutral-100 transition-colors duration-200 ${
                isFolded ? "is-folded" : ""
            }`}
            data-theme={theme}
        >
            <CodeBlockHeader
                language={language}
                isFolded={isFolded}
                rootFoldState={rootFoldState}
                viewMode={viewMode}
                hasRenderedView={hasRenderedView}
                isCopied={isCopied}
                onCycleFold={handleCycleFold}
                onToggleCollapse={handleToggleCollapse}
                onToggleFold={handleCycleFold}
                onToggleViewMode={handleToggleViewMode}
                onCopy={handleCopy}
            />
            {!isFolded && (
                <div class="ext-codeblock-body relative w-full">
                    {viewMode === "rendered" && hasRenderedView
                        ? (
                            children || (
                                <CodeBlockViewDispatcher
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
