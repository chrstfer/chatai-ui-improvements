import type { JSX } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import type { DocumentViewProps } from "@internal/contracts/features/renderers";
import { defaultAstCache } from "@internal/store";
import { computeContentHash } from "@internal/core/utils";
import { type OrgDocumentElement, parseOrgDocument } from "@internal/features/parsers/org";
import { OrgElementRenderer } from "./OrgElementRenderer.tsx";

import type { HeadlineFoldState } from "./OrgHeadlineView.tsx";

export type { HeadlineFoldState } from "./OrgHeadlineView.tsx";

export interface OrgDocumentViewState {
    readonly rootFoldState?: HeadlineFoldState;
    readonly foldedHeadlines?: readonly string[];
    readonly headlineFoldStates?: Readonly<Record<string, HeadlineFoldState>>;
    readonly foldedBlocks?: readonly string[];
    readonly checkedItems?: readonly string[];
    readonly todoOverrides?: Readonly<Record<string, string>>;
}

export function OrgDocumentView(props: DocumentViewProps): JSX.Element {
    const { content, language, documentViewState, onSaveViewState } = props;

    // 0ms Cache Hydration with AstCache singleton
    const hash = useMemo(() => computeContentHash(content, "org"), [content]);
    const docAst = useMemo(() => {
        const cached = defaultAstCache.get<OrgDocumentElement>(hash, "org");
        if (cached) return cached;
        const parsed = parseOrgDocument(content);
        defaultAstCache.set(hash, "org", parsed);
        return parsed;
    }, [hash, content]);

    // Top-matter #+STARTUP: directive parsing with fallback to all-expanded
    const savedState = documentViewState as OrgDocumentViewState | undefined;
    const rootFoldState = savedState?.rootFoldState;

    const initialHeadlineFoldStates = useMemo(() => {
        if (savedState?.headlineFoldStates) return savedState.headlineFoldStates;
        const res: Record<string, HeadlineFoldState> = {};
        if (savedState?.foldedHeadlines) {
            for (const id of savedState.foldedHeadlines) {
                res[id] = "folded";
            }
            return res;
        }
        const startup = (docAst.properties?.["startup"] ?? docAst.properties?.["STARTUP"])?.toLowerCase();
        if (rootFoldState === "children" || startup === "overview" || startup === "fold") {
            docAst.children.forEach((c, idx) => {
                if (c.type === "headline") {
                    res[`h-${idx}`] = "folded";
                }
            });
        }
        return res;
    }, [savedState, rootFoldState, docAst]);

    const initialHeadlines = useMemo(() => {
        return Object.entries(initialHeadlineFoldStates)
            .filter(([_, state]) => state === "folded")
            .map(([k]) => k);
    }, [initialHeadlineFoldStates]);

    const [headlineFoldStates, setHeadlineFoldStates] = useState<Readonly<Record<string, HeadlineFoldState>>>(
        initialHeadlineFoldStates,
    );
    const [foldedHeadlines, setFoldedHeadlines] = useState<readonly string[]>(initialHeadlines);
    const [foldedBlocks, setFoldedBlocks] = useState<readonly string[]>(savedState?.foldedBlocks ?? []);
    const [checkedItems, setCheckedItems] = useState<readonly string[]>(savedState?.checkedItems ?? []);
    const [todoOverrides, setTodoOverrides] = useState<Readonly<Record<string, string>>>(
        savedState?.todoOverrides ?? {},
    );

    useEffect(() => {
        if (!rootFoldState) return;
        if (rootFoldState === "children") {
            const res: Record<string, HeadlineFoldState> = {};
            docAst.children.forEach((c, idx) => {
                if (c.type === "headline") {
                    res[`h-${idx}`] = "folded";
                }
            });
            setHeadlineFoldStates(res);
            setFoldedHeadlines(Object.keys(res));
        } else if (rootFoldState === "subtree") {
            setHeadlineFoldStates({});
            setFoldedHeadlines([]);
        }
    }, [rootFoldState, docAst]);

    const cycleHeadlineFold = useCallback(
        (id: string, hasChildHeadlines: boolean, currentFoldState?: HeadlineFoldState) => {
            setHeadlineFoldStates((prev) => {
                const current = currentFoldState ?? prev[id] ?? "subtree";
                let next: HeadlineFoldState;
                if (current === "folded") {
                    next = hasChildHeadlines ? "children" : "subtree";
                } else if (current === "children") {
                    next = "subtree";
                } else {
                    next = "folded";
                }

                // Descendant State Pruning
                const updated: Record<string, HeadlineFoldState> = {};
                const childPrefix = `${id}.`;
                for (const [k, v] of Object.entries(prev)) {
                    if (k === id) continue;
                    if (next === "folded" && k.startsWith(childPrefix)) {
                        continue;
                    }
                    updated[k] = v;
                }
                updated[id] = next;

                const nextFoldedList = Object.entries(updated)
                    .filter(([_, state]) => state === "folded")
                    .map(([k]) => k);
                setFoldedHeadlines(nextFoldedList);
                onSaveViewState?.({
                    rootFoldState,
                    foldedHeadlines: nextFoldedList,
                    headlineFoldStates: updated,
                    foldedBlocks,
                    checkedItems,
                    todoOverrides,
                });
                return updated;
            });
        },
        [rootFoldState, foldedBlocks, checkedItems, todoOverrides, onSaveViewState],
    );

    const toggleHeadlineFold = useCallback((id: string) => {
        cycleHeadlineFold(id, false, headlineFoldStates[id]);
    }, [cycleHeadlineFold, headlineFoldStates]);

    const toggleBlockFold = useCallback((id: string) => {
        setFoldedBlocks((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            onSaveViewState?.({ foldedHeadlines, foldedBlocks: next, checkedItems, todoOverrides });
            return next;
        });
    }, [foldedHeadlines, checkedItems, todoOverrides, onSaveViewState]);

    const toggleCheckbox = useCallback((id: string) => {
        setCheckedItems((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            onSaveViewState?.({ foldedHeadlines, foldedBlocks, checkedItems: next, todoOverrides });
            return next;
        });
    }, [foldedHeadlines, foldedBlocks, todoOverrides, onSaveViewState]);

    const cycleTodo = useCallback((headlineId: string, currentStatus: string) => {
        const sequence = ["TODO", "NEXT", "DONE"];
        const curIdx = sequence.indexOf(currentStatus);
        const nextStatus = curIdx >= 0 ? sequence[(curIdx + 1) % sequence.length] : "TODO";

        setTodoOverrides((prev) => {
            const next = { ...prev, [headlineId]: nextStatus };
            onSaveViewState?.({ foldedHeadlines, foldedBlocks, checkedItems, todoOverrides: next });
            return next;
        });
    }, [foldedHeadlines, foldedBlocks, checkedItems, onSaveViewState]);

    // In-Shadow smooth scroll navigation
    const handleNavigateInternal = useCallback((targetText: string) => {
        const cleanTarget = targetText.startsWith("*") ? targetText.slice(1).trim() : targetText;
        const selector = `[data-headline-title="${cleanTarget}"], [data-headline-id="${cleanTarget}"], #${cleanTarget}`;
        const targetEl = document.querySelector(selector);
        if (targetEl && typeof targetEl.scrollIntoView === "function") {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, []);

    return (
        <article
            class="org-document-view p-4 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans space-y-3"
            data-language={language}
        >
            {docAst.title && (
                <header class="border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
                    <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                        {docAst.title}
                    </h1>
                </header>
            )}
            <div class="org-document-body space-y-3">
                <OrgElementRenderer
                    elements={docAst.children}
                    foldedHeadlines={foldedHeadlines}
                    headlineFoldStates={headlineFoldStates}
                    onToggleHeadlineFold={toggleHeadlineFold}
                    onCycleHeadlineFold={cycleHeadlineFold}
                    foldedBlocks={foldedBlocks}
                    onToggleBlockFold={toggleBlockFold}
                    checkedItems={checkedItems}
                    onToggleCheckbox={toggleCheckbox}
                    todoOverrides={todoOverrides}
                    onCycleTodo={cycleTodo}
                    onNavigateInternal={handleNavigateInternal}
                    parentPath=""
                />
            </div>
        </article>
    );
}
