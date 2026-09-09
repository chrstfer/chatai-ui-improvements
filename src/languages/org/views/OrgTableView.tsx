import type { JSX } from "preact";
import type { OrgTableColumnAlignment, OrgTableElement } from "../ast/types.ts";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";

export interface OrgTableViewProps {
    readonly table: OrgTableElement;
    readonly onNavigateInternal?: (targetId: string) => void;
}

function getAlignClass(alignment?: OrgTableColumnAlignment): string {
    switch (alignment) {
        case "center":
            return "text-center";
        case "right":
            return "text-right";
        case "left":
        default:
            return "text-left";
    }
}

export function OrgTableView({ table, onNavigateInternal }: OrgTableViewProps): JSX.Element {
    const { rows, alignments, caption, name } = table;

    // Partition rows into thead and tbody based on the first separator rule row
    const firstRuleIdx = rows.findIndex((r) => r.isRule);
    const hasHeader = firstRuleIdx > 0;
    const headerRows = hasHeader ? rows.slice(0, firstRuleIdx) : [];
    const bodyRows = hasHeader ? rows.slice(firstRuleIdx + 1) : rows;

    return (
        <div class="org-table-container my-3 overflow-hidden border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900/30">
            {(caption || name) && (
                <div class="org-table-header px-3 py-1.5 bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400 flex items-center justify-between">
                    {caption && (
                        <div class="flex items-center gap-1">
                            <span class="font-semibold text-neutral-700 dark:text-neutral-300">Table:</span>
                            <OrgObjectRenderer objects={caption} onNavigateInternal={onNavigateInternal} />
                        </div>
                    )}
                    {name && (
                        <span class="font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                            #{name}
                        </span>
                    )}
                </div>
            )}
            <div class="overflow-x-auto w-full">
                <table class="org-table w-full border-collapse text-xs text-neutral-800 dark:text-neutral-200">
                    {hasHeader && (
                        <thead class="bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-900 dark:text-white">
                            {headerRows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                    {row.cells.map((cell, cIdx) => (
                                        <th
                                            key={cIdx}
                                            class={`px-3 py-2 border-r border-neutral-200 dark:border-neutral-700/60 last:border-r-0 ${
                                                getAlignClass(alignments?.[cIdx])
                                            }`}
                                        >
                                            <OrgObjectRenderer
                                                objects={cell.children}
                                                onNavigateInternal={onNavigateInternal}
                                            />
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                    )}
                    <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800/80">
                        {bodyRows.map((row, rIdx) => {
                            if (row.isRule) {
                                return (
                                    <tr
                                        key={rIdx}
                                        class="org-table-rule border-b-2 border-neutral-300 dark:border-neutral-700"
                                    >
                                        <td colSpan={100} class="p-0 h-0.5 bg-neutral-200 dark:bg-neutral-800" />
                                    </tr>
                                );
                            }
                            return (
                                <tr
                                    key={rIdx}
                                    class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
                                >
                                    {row.cells.map((cell, cIdx) => (
                                        <td
                                            key={cIdx}
                                            class={`px-3 py-1.5 border-r border-neutral-200/60 dark:border-neutral-800/60 last:border-r-0 ${
                                                getAlignClass(alignments?.[cIdx])
                                            }`}
                                        >
                                            <OrgObjectRenderer
                                                objects={cell.children}
                                                onNavigateInternal={onNavigateInternal}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
