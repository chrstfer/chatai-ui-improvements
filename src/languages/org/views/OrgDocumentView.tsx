import type { JSX } from "preact";
import { useCallback, useMemo, useState } from "preact/hooks";
import type { DocumentViewProps } from "../../../core/contracts/documentView.ts";
import { defaultAstCache } from "../../../store/astCache.ts";
import { computeContentHash } from "../../../core/utils/contentHash.ts";
import type { OrgDocumentElement } from "../ast/types.ts";
import { parseOrgDocument } from "../ast/parser.ts";
import { OrgElementRenderer } from "./OrgElementRenderer.tsx";

export interface OrgDocumentViewState {
    readonly foldedHeadlines?: readonly string[];
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
    const initialHeadlines = useMemo(() => {
        if (savedState?.foldedHeadlines) return savedState.foldedHeadlines;
        const startup = (docAst.properties?.["startup"] ?? docAst.properties?.["STARTUP"])?.toLowerCase();
        if (startup === "overview" || startup === "fold") {
            return docAst.children
                .map((c, idx) => ({ c, idx }))
                .filter(({ c }) => c.type === "headline")
                .map(({ idx }) => `h-${idx}`);
        }
        return [];
    }, [savedState, docAst]);

    const [foldedHeadlines, setFoldedHeadlines] = useState<readonly string[]>(initialHeadlines);
    const [foldedBlocks, setFoldedBlocks] = useState<readonly string[]>(savedState?.foldedBlocks ?? []);
    const [checkedItems, setCheckedItems] = useState<readonly string[]>(savedState?.checkedItems ?? []);
    const [todoOverrides, setTodoOverrides] = useState<Readonly<Record<string, string>>>(
        savedState?.todoOverrides ?? {},
    );

    const toggleHeadlineFold = useCallback((id: string) => {
        setFoldedHeadlines((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
            onSaveViewState?.({ foldedHeadlines: next, foldedBlocks, checkedItems, todoOverrides });
            return next;
        });
    }, [foldedBlocks, checkedItems, todoOverrides, onSaveViewState]);

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
                    onToggleHeadlineFold={toggleHeadlineFold}
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
