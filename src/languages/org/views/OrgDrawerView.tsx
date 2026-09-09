import type { JSX } from "preact";
import { useState } from "preact/hooks";
import type { OrgDrawerElement, OrgPropertyDrawerElement } from "../ast/types.ts";

export interface OrgDrawerViewProps {
    readonly drawer: OrgPropertyDrawerElement | OrgDrawerElement;
    readonly initialFolded?: boolean;
}

export function OrgDrawerView({ drawer, initialFolded = true }: OrgDrawerViewProps): JSX.Element {
    const [isFolded, setIsFolded] = useState(initialFolded);
    const isPropertyDrawer = drawer.type === "property_drawer";
    const drawerName = isPropertyDrawer ? "PROPERTIES" : drawer.name;

    return (
        <aside class="org-drawer my-2 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden bg-neutral-50/50 dark:bg-neutral-900/30 text-xs font-mono">
            <button
                type="button"
                onClick={() => setIsFolded((f) => !f)}
                class="w-full flex items-center justify-between px-2.5 py-1 text-left bg-neutral-100/70 dark:bg-neutral-800/50 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 select-none cursor-pointer transition-colors"
                aria-expanded={!isFolded}
            >
                <div class="flex items-center gap-1.5 font-semibold text-[11px] tracking-wide text-neutral-700 dark:text-neutral-300">
                    <span class="text-neutral-400 dark:text-neutral-500">{isFolded ? "▶" : "▼"}</span>
                    <span>:{drawerName}:</span>
                </div>
                <span class="text-[10px] text-neutral-400">
                    {isPropertyDrawer
                        ? `${Object.keys(drawer.properties).length} props`
                        : `${drawer.lines.length} lines`}
                </span>
            </button>

            {!isFolded && (
                <div class="p-2 border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/60">
                    {isPropertyDrawer
                        ? (
                            <table class="w-full border-collapse">
                                <tbody>
                                    {Object.entries(drawer.properties).map(([key, value]) => (
                                        <tr
                                            key={key}
                                            class="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0"
                                        >
                                            <td class="py-0.5 pr-3 font-semibold text-neutral-500 dark:text-neutral-400 whitespace-nowrap align-top">
                                                :{key}:
                                            </td>
                                            <td class="py-0.5 text-neutral-800 dark:text-neutral-200 break-words">
                                                {value}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )
                        : (
                            <div class="space-y-0.5 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                                {drawer.lines.map((line, i) => <div key={i}>{line}</div>)}
                            </div>
                        )}
                </div>
            )}
        </aside>
    );
}
