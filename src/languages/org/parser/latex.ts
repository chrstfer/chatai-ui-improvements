/**
 * KaTeX LaTeX Math Renderer
 * Pure synchronous HTML generation, zero eval, zero external network requests.
 */

import katex from "katex";

interface KatexInstance {
    renderToString(latex: string, options?: Record<string, unknown>): string;
    render(latex: string, element: HTMLElement, options?: Record<string, unknown>): void;
}

function getKatexInstance(): KatexInstance {
    if (typeof globalThis !== "undefined" && (globalThis as unknown as { katex?: KatexInstance }).katex) {
        return (globalThis as unknown as { katex: KatexInstance }).katex;
    }
    return katex;
}

export function renderLatexToString(latex: string, displayMode = false): string {
    try {
        const k = getKatexInstance();
        return k.renderToString(latex.trim(), {
            displayMode,
            throwOnError: false,
            output: "htmlAndMathml",
            strict: false,
        });
    } catch (e) {
        console.warn("[GeminiOrgMod] KaTeX render error:", e);
        return `<code class="org-latex-error">${latex}</code>`;
    }
}

export function renderLatexIntoDOM(latex: string, container: HTMLElement, displayMode = false): void {
    try {
        container.textContent = "";
        const k = getKatexInstance();
        k.render(latex.trim(), container, {
            displayMode,
            throwOnError: false,
            output: "htmlAndMathml",
            strict: false,
        });
    } catch (e) {
        console.warn("[GeminiOrgMod] KaTeX render error:", e);
        container.textContent = latex;
    }
}
