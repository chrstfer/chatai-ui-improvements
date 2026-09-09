import type { JSX } from "preact";
import type { OrgParagraphElement } from "../ast/types.ts";
import { OrgObjectRenderer } from "./OrgObjectRenderer.tsx";

export interface OrgParagraphViewProps {
    readonly paragraph: OrgParagraphElement;
    readonly onNavigateInternal?: (targetId: string) => void;
}

export function OrgParagraphView({ paragraph, onNavigateInternal }: OrgParagraphViewProps): JSX.Element {
    return (
        <div class="org-paragraph-container my-2">
            {paragraph.caption && (
                <div class="org-caption text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 flex items-center gap-1">
                    <span class="font-semibold text-neutral-600 dark:text-neutral-300">Caption:</span>
                    <OrgObjectRenderer objects={paragraph.caption} onNavigateInternal={onNavigateInternal} />
                </div>
            )}
            <p class="org-paragraph leading-relaxed text-neutral-800 dark:text-neutral-200">
                <OrgObjectRenderer objects={paragraph.children} onNavigateInternal={onNavigateInternal} />
            </p>
        </div>
    );
}
