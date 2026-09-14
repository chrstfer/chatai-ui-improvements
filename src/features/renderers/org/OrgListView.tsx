import type { JSX } from "preact";
import type { OrgElement, OrgListElement, OrgListItemElement, OrgObject } from "../../parsers/org/index.ts";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";

export interface OrgListViewProps {
    readonly list: OrgListElement;
    readonly listPath: string;
    readonly checkedItems?: readonly string[];
    readonly onToggleCheckbox?: (itemId: string) => void;
    readonly onNavigateInternal?: (targetId: string) => void;
    readonly renderElement?: (
        element: OrgElement,
        index: number,
        parentPath: string,
    ) => JSX.Element | null;
}

function countCheckboxes(
    item: OrgListItemElement,
    parentPath: string,
    checkedItems?: readonly string[],
): { total: number; checked: number } {
    let total = 0;
    let checked = 0;

    for (let i = 0; i < item.children.length; i++) {
        const child = item.children[i];
        if ("type" in child && child.type === "list") {
            const listEl = child as OrgListElement;
            const subListPath = `${parentPath}l-${i}.`;
            for (let j = 0; j < listEl.children.length; j++) {
                const subItem = listEl.children[j];
                const subItemId = `${subListPath}i-${j}`;
                if (subItem.checked !== undefined) {
                    total++;
                    const isChecked = checkedItems ? checkedItems.includes(subItemId) : Boolean(subItem.checked);
                    if (isChecked) checked++;
                }
            }
        }
    }

    return { total, checked };
}

export function OrgListView({
    list,
    listPath,
    checkedItems,
    onToggleCheckbox,
    onNavigateInternal,
    renderElement,
}: OrgListViewProps): JSX.Element {
    const isOrdered = list.ordered;
    const ListTag = isOrdered ? "ol" : "ul";
    const listClasses = isOrdered
        ? "org-list org-list-ordered list-decimal list-outside ml-5 space-y-1.5 my-2 text-sm text-neutral-800 dark:text-neutral-200"
        : "org-list org-list-unordered list-disc list-outside ml-5 space-y-1.5 my-2 text-sm text-neutral-800 dark:text-neutral-200";

    return (
        <ListTag class={listClasses}>
            {list.children.map((item, idx) => {
                const itemId = `${listPath}i-${idx}`;
                const hasCheckbox = item.checked !== undefined;
                const isChecked = checkedItems ? checkedItems.includes(itemId) : Boolean(item.checked);

                // Check for dynamic cookie recalculation
                const { total, checked: childCheckedCount } = countCheckboxes(item, itemId + ".", checkedItems);
                let dynamicCookie = item.counterCookie;
                if (dynamicCookie && total > 0) {
                    if (dynamicCookie.includes("%")) {
                        const pct = Math.round((childCheckedCount / total) * 100);
                        dynamicCookie = `[${pct}%]`;
                    } else {
                        dynamicCookie = `[${childCheckedCount}/${total}]`;
                    }
                }

                // Partition item children into phrasing objects vs structural elements (e.g. nested lists)
                const inlineChildren: OrgObject[] = [];
                const blockChildren: OrgElement[] = [];

                for (const child of item.children) {
                    if ("type" in child) {
                        const t = child.type;
                        if (
                            t === "list" || t === "block" || t === "table" || t === "headline" ||
                            t === "paragraph" || t === "property_drawer" || t === "drawer"
                        ) {
                            blockChildren.push(child as OrgElement);
                        } else {
                            inlineChildren.push(child as OrgObject);
                        }
                    }
                }

                return (
                    <li
                        key={idx}
                        class={`org-list-item ${hasCheckbox ? "list-none -ml-5 flex flex-col" : ""}`}
                        data-item-id={itemId}
                    >
                        <div class="flex items-start gap-2">
                            {hasCheckbox && (
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onToggleCheckbox?.(itemId)}
                                    class="org-checkbox mt-1 h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                    aria-label={`Toggle item ${idx + 1}`}
                                />
                            )}

                            <div class="flex-1 min-w-0">
                                {item.tag && (
                                    <span class="org-list-tag font-semibold text-neutral-900 dark:text-white mr-1.5">
                                        <OrgObjectRenderer
                                            objects={item.tag}
                                            onNavigateInternal={onNavigateInternal}
                                        />{" "}
                                        ::
                                    </span>
                                )}

                                {dynamicCookie && (
                                    <span
                                        class="org-cookie inline-block text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 mr-1.5"
                                        title="Completion Progress"
                                    >
                                        {dynamicCookie}
                                    </span>
                                )}

                                <OrgObjectRenderer
                                    objects={inlineChildren}
                                    onNavigateInternal={onNavigateInternal}
                                />
                            </div>
                        </div>

                        {blockChildren.length > 0 && (
                            <div class="org-list-nested ml-4 mt-1 space-y-1">
                                {blockChildren.map((blockChild, bIdx) => {
                                    if (blockChild.type === "list") {
                                        return (
                                            <OrgListView
                                                key={bIdx}
                                                list={blockChild as OrgListElement}
                                                listPath={`${itemId}.l-${bIdx}.`}
                                                checkedItems={checkedItems}
                                                onToggleCheckbox={onToggleCheckbox}
                                                onNavigateInternal={onNavigateInternal}
                                                renderElement={renderElement}
                                            />
                                        );
                                    }
                                    if (renderElement) {
                                        return renderElement(blockChild, bIdx, `${itemId}.b-${bIdx}.`);
                                    }
                                    return null;
                                })}
                            </div>
                        )}
                    </li>
                );
            })}
        </ListTag>
    );
}
