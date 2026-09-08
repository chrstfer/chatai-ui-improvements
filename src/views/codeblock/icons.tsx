import type { JSX } from "preact";

export interface IconProps {
    class?: string;
    size?: number;
}

export function CopyIcon({ class: className = "", size = 16 }: IconProps): JSX.Element {
    return (
        <svg
            class={`ext-icon ext-icon-copy ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

export function CheckmarkIcon({ class: className = "", size = 16 }: IconProps): JSX.Element {
    return (
        <svg
            class={`ext-icon ext-icon-check ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

export interface ChevronIconProps extends IconProps {
    isFolded?: boolean;
}

export function ChevronIcon({ class: className = "", size = 16, isFolded = false }: ChevronIconProps): JSX.Element {
    return (
        <svg
            class={`ext-icon ext-icon-chevron ${isFolded ? "is-folded" : ""} ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );
}

export interface ViewToggleIconProps extends IconProps {
    viewMode: "rendered" | "raw";
}

export function ViewToggleIcon({ class: className = "", size = 16, viewMode }: ViewToggleIconProps): JSX.Element {
    if (viewMode === "raw") {
        // Rendered view icon (formatted document icon to switch to rendered)
        return (
            <svg
                class={`ext-icon ext-icon-view ${className}`}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
            </svg>
        );
    }

    // Code bracket icon (to switch to raw source)
    return (
        <svg
            class={`ext-icon ext-icon-view ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
        </svg>
    );
}
