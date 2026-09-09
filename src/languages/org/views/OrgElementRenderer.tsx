import type { JSX } from "preact";
import type { OrgElement } from "../ast/types.ts";
import { OrgHeadlineView } from "./OrgHeadlineView.tsx";
import { OrgParagraphView } from "./OrgParagraphView.tsx";
import { OrgBlockView } from "./OrgBlockView.tsx";
import { OrgTableView } from "./OrgTableView.tsx";
import { OrgListView } from "./OrgListView.tsx";
import { OrgDrawerView } from "./OrgDrawerView.tsx";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";

export interface OrgElementRendererProps {
    readonly elements?: readonly OrgElement[] | OrgElement | null;
    readonly parentPath?: string;
    readonly foldedHeadlines?: readonly string[];
    readonly onToggleHeadlineFold?: (headlineId: string) => void;
    readonly foldedBlocks?: readonly string[];
    readonly onToggleBlockFold?: (blockId: string) => void;
    readonly checkedItems?: readonly string[];
    readonly onToggleCheckbox?: (itemId: string) => void;
    readonly todoOverrides?: Readonly<Record<string, string>>;
    readonly onCycleTodo?: (headlineId: string, currentStatus: string) => void;
    readonly onNavigateInternal?: (targetId: string) => void;
}

export function OrgElementRenderer(props: OrgElementRendererProps): JSX.Element | null {
    const {
        elements,
        parentPath = "",
        foldedHeadlines,
        onToggleHeadlineFold,
        foldedBlocks,
        onToggleBlockFold,
        checkedItems,
        onToggleCheckbox,
        todoOverrides,
        onCycleTodo,
        onNavigateInternal,
    } = props;

    if (!elements) return null;
    const items = Array.isArray(elements) ? elements : [elements];

    const renderChildElement = (
        child: OrgElement,
        cIdx: number,
        currentPath: string,
    ): JSX.Element | null => {
        return (
            <OrgElementRenderer
                key={cIdx}
                elements={child}
                parentPath={currentPath}
                foldedHeadlines={foldedHeadlines}
                onToggleHeadlineFold={onToggleHeadlineFold}
                foldedBlocks={foldedBlocks}
                onToggleBlockFold={onToggleBlockFold}
                checkedItems={checkedItems}
                onToggleCheckbox={onToggleCheckbox}
                todoOverrides={todoOverrides}
                onCycleTodo={onCycleTodo}
                onNavigateInternal={onNavigateInternal}
            />
        );
    };

    return (
        <>
            {items.map((elem, idx) => {
                const pathPrefix = parentPath ? `${parentPath}.` : "";

                switch (elem.type) {
                    case "headline": {
                        const headlineId = `${pathPrefix}h-${idx}`;
                        const isFolded = foldedHeadlines ? foldedHeadlines.includes(headlineId) : false;

                        return (
                            <OrgHeadlineView
                                key={idx}
                                headline={elem}
                                headlinePath={headlineId}
                                isFolded={isFolded}
                                onToggleFold={onToggleHeadlineFold}
                                todoOverrides={todoOverrides}
                                onCycleTodo={onCycleTodo}
                                onNavigateInternal={onNavigateInternal}
                                renderElement={renderChildElement}
                            />
                        );
                    }

                    case "paragraph":
                        return (
                            <OrgParagraphView
                                key={idx}
                                paragraph={elem}
                                onNavigateInternal={onNavigateInternal}
                            />
                        );

                    case "block":
                    case "dynamic_block":
                    case "fixed_width": {
                        const nameSuffix = "name" in elem && elem.name ? `:${elem.name}` : "";
                        const blockId = `${pathPrefix}b-${idx}${nameSuffix}`;
                        const isFolded = foldedBlocks ? foldedBlocks.includes(blockId) : false;

                        return (
                            <OrgBlockView
                                key={idx}
                                block={elem}
                                blockId={blockId}
                                isFolded={isFolded}
                                onToggleFold={onToggleBlockFold}
                                onNavigateInternal={onNavigateInternal}
                            />
                        );
                    }

                    case "table":
                        return (
                            <OrgTableView
                                key={idx}
                                table={elem}
                                onNavigateInternal={onNavigateInternal}
                            />
                        );

                    case "list": {
                        const listPath = `${pathPrefix}l-${idx}.`;
                        return (
                            <OrgListView
                                key={idx}
                                list={elem}
                                listPath={listPath}
                                checkedItems={checkedItems}
                                onToggleCheckbox={onToggleCheckbox}
                                onNavigateInternal={onNavigateInternal}
                                renderElement={renderChildElement}
                            />
                        );
                    }

                    case "property_drawer":
                    case "drawer":
                        return <OrgDrawerView key={idx} drawer={elem} />;

                    case "horizontal_rule":
                        return <hr key={idx} class="org-hr my-4 border-t border-neutral-200 dark:border-neutral-800" />;

                    case "section":
                        return (
                            <div key={idx} class="org-section space-y-2">
                                <OrgElementRenderer
                                    elements={elem.children}
                                    parentPath={`${pathPrefix}s-${idx}`}
                                    foldedHeadlines={foldedHeadlines}
                                    onToggleHeadlineFold={onToggleHeadlineFold}
                                    foldedBlocks={foldedBlocks}
                                    onToggleBlockFold={onToggleBlockFold}
                                    checkedItems={checkedItems}
                                    onToggleCheckbox={onToggleCheckbox}
                                    todoOverrides={todoOverrides}
                                    onCycleTodo={onCycleTodo}
                                    onNavigateInternal={onNavigateInternal}
                                />
                            </div>
                        );

                    case "footnote_definition":
                        return (
                            <div
                                key={idx}
                                class="org-footnote-definition my-2 p-2 rounded bg-neutral-50 dark:bg-neutral-900 border-l-2 border-blue-500 text-xs text-neutral-600 dark:text-neutral-400"
                            >
                                <span class="font-bold text-blue-600 dark:text-blue-400 mr-2">[{elem.label}]</span>
                                <OrgElementRenderer
                                    elements={elem.children}
                                    parentPath={`${pathPrefix}fn-${idx}`}
                                    foldedHeadlines={foldedHeadlines}
                                    onToggleHeadlineFold={onToggleHeadlineFold}
                                    foldedBlocks={foldedBlocks}
                                    onToggleBlockFold={onToggleBlockFold}
                                    checkedItems={checkedItems}
                                    onToggleCheckbox={onToggleCheckbox}
                                    todoOverrides={todoOverrides}
                                    onCycleTodo={onCycleTodo}
                                    onNavigateInternal={onNavigateInternal}
                                />
                            </div>
                        );

                    case "latex_environment":
                        return (
                            <div key={idx} class="org-latex-environment my-3 text-center">
                                <OrgObjectRenderer
                                    objects={{ type: "latex_fragment", value: elem.value }}
                                    onNavigateInternal={onNavigateInternal}
                                />
                            </div>
                        );

                    case "comment":
                    default:
                        return null;
                }
            })}
        </>
    );
}
