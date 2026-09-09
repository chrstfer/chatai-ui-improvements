import type { JSX } from "preact";
import { useState } from "preact/hooks";

export interface InlineImageViewProps {
    readonly src: string;
    readonly alt?: string;
    readonly title?: string;
}

export function InlineImageView({ src, alt, title }: InlineImageViewProps): JSX.Element {
    const [isFolded, setIsFolded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const label = title || alt || src.split("/").pop() || "Image";

    if (hasError) {
        return (
            <div class="inline-image-error p-2 my-2 rounded border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <span>
                    Failed to preview image: <span class="font-mono">{label}</span>
                </span>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:underline ml-2"
                >
                    Open Link ↗
                </a>
            </div>
        );
    }

    return (
        <figure class="inline-image-container my-3 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-neutral-50 dark:bg-neutral-900/40">
            <figcaption
                class="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none"
                onClick={() => setIsFolded((f) => !f)}
            >
                <div class="flex items-center gap-2">
                    <span class="text-neutral-400 dark:text-neutral-500 font-mono text-[11px]">
                        {isFolded ? "▶" : "▼"}
                    </span>
                    <span class="font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
                </div>
                <a
                    href={src}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 text-[11px]"
                >
                    Open ↗
                </a>
            </figcaption>
            {!isFolded && (
                <div class="p-2 flex justify-center bg-white dark:bg-neutral-950">
                    <img
                        src={src}
                        alt={alt || label}
                        loading="lazy"
                        onError={() => setHasError(true)}
                        class="max-w-full h-auto rounded object-contain max-h-[500px]"
                    />
                </div>
            )}
        </figure>
    );
}
