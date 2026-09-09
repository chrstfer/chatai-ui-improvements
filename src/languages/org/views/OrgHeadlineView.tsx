import type { JSX } from "preact";
import type { OrgElement, OrgHeadlineElement, OrgObject } from "../ast/types.ts";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";
import { OrgDrawerView } from "./OrgDrawerView.tsx";

export interface OrgHeadlineViewProps {
    readonly headline: OrgHeadlineElement;
    readonly headlinePath: string;
    readonly isFolded?: boolean;
    readonly onToggleFold?: (headlineId: string) => void;
    readonly todoOverrides?: Readonly<Record<string, string>>;
    readonly onCycleTodo?: (headlineId: string, currentStatus: string) => void;
    readonly onNavigateInternal?: (targetId: string) => void;
    readonly renderElement?: (
        element: OrgElement,
        index: number,
        parentPath: string,
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
            return "text-xl font-bold text-blue-700 dark:text-blue-400 border-b border-neutral-200 dark:border-neutral-800 pb-1 mb-2 mt-4";
        case 2:
            return "text-lg font-semibold text-purple-700 dark:text-purple-400 mb-2 mt-3";
        case 3:
            return "text-base font-semibold text-teal-700 dark:text-teal-400 mb-1 mt-2";
        default:
            return "text-sm font-medium text-amber-700 dark:text-amber-400 mb-1 mt-2";
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
    onToggleFold,
    todoOverrides,
    onCycleTodo,
    onNavigateInternal,
    renderElement,
}: OrgHeadlineViewProps): JSX.Element {
    const { level, priority, title, tags, planning, properties, children } = headline;
    const headlineId = headlinePath;
    const plainTitle = extractText(title).trim();

    const currentTodo = todoOverrides?.[headlineId] ?? headline.todoKeyword;
    const isDone = currentTodo === "DONE" || currentTodo === "CANCELLED";

    const HeaderTag = getHeaderTag(level);
    const styleClasses = getHeadlineStyles(level);

    return (
        <section
            class="org-headline-section my-2"
            data-headline-id={headlineId}
            data-headline-title={plainTitle}
            data-level={level}
        >
            <HeaderTag
                class={`org-headline flex items-baseline justify-between gap-2 select-none group ${styleClasses}`}
                role={level > 6 ? "heading" : undefined}
                aria-level={level > 6 ? level : undefined}
            >
                <div class="flex items-center gap-2 flex-wrap min-w-0">
                    <button
                        type="button"
                        onClick={() => onToggleFold?.(headlineId)}
                        class="org-fold-toggle text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 font-mono text-xs cursor-pointer p-0.5 rounded transition-colors"
                        title={isFolded ? "Expand subtree" : "Collapse subtree"}
                        aria-expanded={!isFolded}
                    >
                        {isFolded ? "▶" : "▼"}
                    </button>

                    {currentTodo && (
                        <button
                            type="button"
                            onClick={() => onCycleTodo?.(headlineId, currentTodo)}
                            class={`org-todo-badge text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border cursor-pointer select-none transition-colors ${
                                getTodoBadgeClass(currentTodo)
                            }`}
                            title="Click to cycle TODO state"
                        >
                            {currentTodo}
                        </button>
                    )}

                    {priority && (
                        <span class="org-priority font-mono text-xs font-semibold px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200">
                            [#{priority}]
                        </span>
                    )}

                    <span
                        class={`org-headline-title select-text ${
                            isDone ? "line-through opacity-60 dark:opacity-50" : ""
                        }`}
                    >
                        <OrgObjectRenderer objects={title} onNavigateInternal={onNavigateInternal} />
                    </span>
                </div>

                {tags.length > 0 && (
                    <div class="org-tags flex items-center gap-1 shrink-0">
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
            </HeaderTag>

            {planning && (
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

            {properties && Object.keys(properties).length > 0 && (
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

            {!isFolded && children.length > 0 && (
                <div class="org-headline-body pl-3 md:pl-5 border-l border-neutral-200/50 dark:border-neutral-800/50 space-y-2 mt-2">
                    {children.map((child, cIdx) => {
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
