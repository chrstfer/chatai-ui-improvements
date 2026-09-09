import type { JSX } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import katex from "katex";
import { getKatexStyleSheet } from "../../styles/adoptedStyleSheets.ts";

export interface LatexMathViewProps {
    readonly value: string;
}

interface KaTeXDomNode {
    readonly classes?: readonly string[];
    readonly children?: readonly KaTeXDomNode[];
    readonly text?: string;
    readonly attributes?: Record<string, string>;
    readonly style?: Record<string, string>;
    readonly pathName?: string;
    readonly alternate?: string;
    readonly svgName?: string;
}

function renderKaTeXDomNode(node: KaTeXDomNode, key: number | string): JSX.Element | string | null {
    if (!node) return null;

    // Text leaf node
    if (node.text !== undefined && (!node.children || node.children.length === 0)) {
        if (!node.classes || node.classes.length === 0) {
            return node.text;
        }
        return (
            <span key={key} class={node.classes.filter(Boolean).join(" ")} style={node.style}>
                {node.text}
            </span>
        );
    }

    // Path element (inside SVG)
    if (node.pathName || node.alternate) {
        const d = node.alternate || node.pathName;
        return <path key={key} d={d} {...node.attributes} />;
    }

    // SVG container element
    if (
        node.svgName ||
        (node.attributes && (node.attributes.viewBox || node.attributes.xmlns === "http://www.w3.org/2000/svg"))
    ) {
        return (
            <svg
                key={key}
                class={node.classes?.filter(Boolean).join(" ") || undefined}
                style={node.style}
                {...node.attributes}
            >
                {node.children?.map((child, i) => renderKaTeXDomNode(child, i))}
            </svg>
        );
    }

    const children = node.children?.map((child, i) => renderKaTeXDomNode(child, i));

    // Link element
    if (node.attributes && node.attributes.href) {
        return (
            <a
                key={key}
                href={node.attributes.href}
                class={node.classes?.filter(Boolean).join(" ") || undefined}
                style={node.style}
            >
                {children}
            </a>
        );
    }

    // Standard span container
    return (
        <span
            key={key}
            class={node.classes?.filter(Boolean).join(" ") || undefined}
            style={node.style}
            {...node.attributes}
        >
            {children}
        </span>
    );
}

export function LatexMathView({ value }: LatexMathViewProps): JSX.Element {
    const containerRef = useRef<HTMLSpanElement>(null);
    const isDisplay = value.startsWith("$$") || value.startsWith("\\begin{equation}") || value.startsWith("\\[");
    const trimmed = value
        .replace(/^\$\$|\$\$$|^\\\(|\\\)$|^\\\[|\\\]$/g, "")
        .replace(/^\$|\$$/g, "")
        .replace(/^\\begin\{equation\}|\\end\{equation\}$/g, "")
        .trim();

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        try {
            const root = containerRef.current.getRootNode();
            const isShadow = (typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot) ||
                (root && typeof (root as { adoptedStyleSheets?: unknown }).adoptedStyleSheets !== "undefined");
            if (isShadow) {
                const shadow = root as { adoptedStyleSheets: CSSStyleSheet[] };
                const katexSheet = getKatexStyleSheet();
                if (katexSheet && !shadow.adoptedStyleSheets.includes(katexSheet)) {
                    shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, katexSheet];
                }
            }
        } catch {
            /* Gracefully ignore in non-DOM test environments */
        }
    }, []);

    try {
        const domTree = (katex as unknown as { __renderToDomTree?: (expr: string, opts: unknown) => KaTeXDomNode })
            .__renderToDomTree?.(trimmed, { throwOnError: false, displayMode: isDisplay, output: "html" });
        if (domTree) {
            return (
                <span ref={containerRef} class="latex-math inline-block">
                    {renderKaTeXDomNode(domTree, "root")}
                </span>
            );
        }
    } catch {
        /* Gracefully fall through to styled fallback typography */
    }

    return (
        <span
            ref={containerRef}
            class="math-fallback font-mono text-xs px-1 py-0.5 rounded bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
        >
            {value}
        </span>
    );
}
