import type { JSX } from "preact";
import { useState } from "preact/hooks";
import {
    type OrgElement,
    type OrgHeadlineElement,
    type OrgObject,
    serializeOrgSubtree,
} from "@internal/features/parsers/org";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";
import { OrgDrawerView } from "./OrgDrawerView.tsx";

export type HeadlineFoldState = "folded" | "children" | "subtree";

export interface OrgHeadlineViewProps {
    readonly headline: OrgHeadlineElement;
    readonly headlinePath: string;
    readonly isFolded?: boolean;
    readonly foldState?: HeadlineFoldState;
    readonly defaultFoldState?: HeadlineFoldState;
    readonly onToggleFold?: (headlineId: string) => void;
    readonly onCycleFold?: (
        headlineId: string,
        hasChildHeadlines: boolean,
        currentFoldState: HeadlineFoldState,
    ) => void;
    readonly todoOverrides?: Readonly<Record<string, string>>;
    readonly onCycleTodo?: (headlineId: string, currentStatus: string) => void;
    readonly onNavigateInternal?: (targetId: string) => void;
    readonly renderElement?: (
        element: OrgElement,
        index: number,
        parentPath: string,
        defaultFoldState?: HeadlineFoldState,
    ) => JSX.Element | null;
}

function extractText(objects?: readonly OrgObject[] | OrgObject | null): string {
    if (!objects) return "";
    const items = Array.isArray(objects) ? objects : [objects];
    return items.map((o) => {
        if ("value" in o && typeof o.value === "string") return o.value;
        if ("children" in o && Array.isArray(o.children)) return extractText(o.children);
        return "";
    }).join("");
}

function getHeadlineStyles(level: number): string {
    switch (level) {
        case 1:
            return "text-[1.12rem] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/50";
        case 2:
            return "text-[1.05rem] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-800/50";
        case 3:
            return "text-[0.98rem] font-medium text-teal-700 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/20 border-teal-200/60 dark:border-teal-800/50";
        case 4:
            return "text-[0.92rem] font-medium text-amber-700 dark:text-amber-300 bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/50";
        case 5:
            return "text-[0.88rem] font-medium text-rose-700 dark:text-rose-300 bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/50";
        case 6:
        default:
            return "text-[0.84rem] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50";
    }
}

function getTodoBadgeClass(status: string): string {
    const s = status.toUpperCase();
    if (s === "DONE" || s === "CANCELLED") {
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
    }
    if (s === "WAITING" || s === "HOLD") {
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800";
    }
    return "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800";
}

type HeadlineTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";

function getHeaderTag(level: number): HeadlineTag {
    if (level === 1) return "h1";
    if (level === 2) return "h2";
    if (level === 3) return "h3";
    if (level === 4) return "h4";
    if (level === 5) return "h5";
    if (level === 6) return "h6";
    return "div";
}

export function OrgHeadlineView({
    headline,
    headlinePath,
    isFolded = false,
    foldState,
    defaultFoldState,
    onToggleFold,
    onCycleFold,
    todoOverrides,
    onCycleTodo,
    onNavigateInternal,
    renderElement,
}: OrgHeadlineViewProps): JSX.Element {
    const [copied, setCopied] = useState(false);
    const { level, priority, title, tags, planning, properties, children } = headline;
    const headlineId = headlinePath;
    const plainTitle = extractText(title).trim();

    const hasChildHeadlines = children.some((c) => c.type === "headline");
    const hasPropertyDrawerChild = children.some((c) => c.type === "property_drawer");
    const activeFoldState: HeadlineFoldState = foldState ?? (defaultFoldState ?? (isFolded ? "folded" : "subtree"));

    const currentTodo = todoOverrides?.[headlineId] ?? headline.todoKeyword;
    const isDone = currentTodo === "DONE" || currentTodo === "CANCELLED";

    const HeaderTag = getHeaderTag(level);
    const styleClasses = getHeadlineStyles(level);

    const handleFoldAction = () => {
        if (onCycleFold) {
            onCycleFold(headlineId, hasChildHeadlines, activeFoldState);
        } else if (onToggleFold) {
            onToggleFold(headlineId);
        }
    };

    const handleHeadingClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
            target.closest(
                "a, button:not(.org-fold-toggle), input, .org-todo-badge, .org-subtree-copy-btn, .org-priority",
            )
        ) {
            return;
        }
        handleFoldAction();
    };

    const handleCopySubtree = async (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const subtreeText = serializeOrgSubtree(headline, todoOverrides, headlineId);
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(subtreeText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch {
            /* Gracefully handle non-browser test environment */
        }
    };

    const foldToggleIcon = activeFoldState === "folded" ? "▶" : activeFoldState === "children" ? "▷" : "▼";
    const foldToggleTitle = activeFoldState === "folded"
        ? (hasChildHeadlines ? "Click to show child headlines" : "Click to expand subtree")
        : activeFoldState === "children"
        ? "Click to expand entire subtree"
        : "Click to collapse subtree";

    return (
        <section
            class="org-headline-section my-2"
            data-headline-id={headlineId}
            data-headline-title={plainTitle}
            data-level={level}
            data-fold-state={activeFoldState}
        >
            <HeaderTag
                class={`org-headline flex items-center justify-between gap-2 border rounded px-2.5 py-1.5 my-1.5 cursor-pointer select-none transition-colors hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 group ${styleClasses}`}
                onClick={handleHeadingClick}
                role={level > 6 ? "heading" : undefined}
                aria-level={level > 6 ? level : undefined}
                title={foldToggleTitle}
            >
                {/* Left: Title Flow pinned to text baseline */}
                <div class="flex items-baseline gap-2 min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleFoldAction();
                        }}
                        class="org-fold-toggle shrink-0 inline-flex items-center text-xs font-mono self-baseline mt-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer p-0.5 rounded transition-colors"
                        title={foldToggleTitle}
                        aria-expanded={activeFoldState !== "folded"}
                    >
                        {foldToggleIcon}
                    </button>

                    {currentTodo && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCycleTodo?.(headlineId, currentTodo);
                            }}
                            class={`org-todo-badge shrink-0 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border cursor-pointer select-none transition-colors ${
                                getTodoBadgeClass(currentTodo)
                            }`}
                            title="Click to cycle TODO state"
                        >
                            {currentTodo}
                        </button>
                    )}

                    {priority && (
                        <span class="org-priority shrink-0 font-mono text-xs font-semibold px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200">
                            [#{priority}]
                        </span>
                    )}

                    <span
                        class={`org-headline-title leading-snug min-w-0 break-words flex-1 select-text ${
                            isDone ? "line-through opacity-60 dark:opacity-50" : ""
                        }`}
                    >
                        <OrgObjectRenderer objects={title} onNavigateInternal={onNavigateInternal} />
                        {activeFoldState !== "subtree" && (
                            <span class="org-fold-ellipsis font-mono text-xs text-neutral-400 dark:text-neutral-500 ml-1 font-bold select-none">
                                ...
                            </span>
                        )}
                    </span>
                </div>

                {/* Right: Actions flow (tags + subtree copy button) */}
                <div class="org-heading-actions shrink-0 flex items-center gap-1.5 ml-2">
                    {tags.length > 0 && (
                        <div class="org-tags flex items-center gap-1">
                            {tags.map((tag, tIdx) => (
                                <span
                                    key={tIdx}
                                    class="org-tag text-[11px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                                >
                                    :{tag}:
                                </span>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleCopySubtree}
                        class={`org-subtree-copy-btn flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                            copied
                                ? "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-700 dark:border-emerald-700"
                                : "opacity-0 group-hover:opacity-100 bg-neutral-50/80 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                        }`}
                        title="Copy subtree"
                        aria-label="Copy subtree"
                    >
                        <svg
                            class="org-copy-icon shrink-0"
                            viewBox="0 0 16 16"
                            width="11"
                            height="11"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
                        </svg>
                        <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                </div>
            </HeaderTag>

            {activeFoldState === "subtree" && planning && (
                <div class="org-planning text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-3 pl-5">
                    {planning.scheduled && (
                        <span>
                            <span class="font-semibold text-emerald-600 dark:text-emerald-400">SCHEDULED:</span>{" "}
                            {planning.scheduled}
                        </span>
                    )}
                    {planning.deadline && (
                        <span>
                            <span class="font-semibold text-rose-600 dark:text-rose-400">DEADLINE:</span>{" "}
                            {planning.deadline}
                        </span>
                    )}
                    {planning.closed && (
                        <span>
                            <span class="font-semibold text-neutral-600 dark:text-neutral-300">CLOSED:</span>{" "}
                            {planning.closed}
                        </span>
                    )}
                </div>
            )}

            {activeFoldState === "subtree" && !hasPropertyDrawerChild && properties &&
                Object.keys(properties).length > 0 && (
                <div class="pl-5 mb-2">
                    <OrgDrawerView
                        drawer={{
                            type: "property_drawer",
                            properties,
                            children: Object.entries(properties).map(([k, v]) => ({
                                type: "node_property",
                                key: k,
                                value: v,
                            })),
                        }}
                    />
                </div>
            )}

            {activeFoldState !== "folded" && children.length > 0 && (
                <div class="org-headline-body pl-3 md:pl-5 border-l border-neutral-200/50 dark:border-neutral-800/50 space-y-2 mt-2">
                    {children.map((child, cIdx) => {
                        // In "children" state, hide direct paragraphs/blocks and only render child headlines in folded state
                        if (activeFoldState === "children") {
                            if (child.type !== "headline") {
                                return null;
                            }
                            if (renderElement) {
                                return renderElement(child, cIdx, `${headlineId}.c-${cIdx}`, "folded");
                            }
                        }
                        if (renderElement) {
                            return renderElement(child, cIdx, `${headlineId}.c-${cIdx}`);
                        }
                        return null;
                    })}
                </div>
            )}
        </section>
    );
}
