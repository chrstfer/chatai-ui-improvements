/**
 * KaTeX LaTeX Math Component
 */

import { useEffect, useRef } from "preact/hooks";
import { renderLatexIntoDOM } from "../parser/latex.ts";

interface LatexProps {
    math: string;
    display?: boolean;
}

export function Latex({ math, display = false }: LatexProps) {
    const elRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (elRef.current) {
            renderLatexIntoDOM(math, elRef.current, display);
        }
    }, [math, display]);

    return (
        <span
            ref={elRef}
            className={display ? "org-latex-display" : "org-latex-inline"}
        />
    );
}
