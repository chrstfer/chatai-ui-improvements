/**
 * Collapsible Org Source Block & Results Component
 */

import { useState } from "preact/hooks";
import { OrgSrcBlockNode } from "../types/ast.ts";

interface SrcBlockProps {
    node: OrgSrcBlockNode;
}

export function SrcBlock({ node }: SrcBlockProps) {
    const [copied, setCopied] = useState(false);
    const codeText = node.content.join("\n");
    const langLabel = node.lang ? node.lang.toUpperCase() : "CODE";

    const handleCopy = async (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(codeText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch (err) {
            console.error("[GeminiOrgMod] Failed to copy code snippet:", err);
        }
    };

    if (node.blockType === "example") {
        return (
            <details className="org-example-block" data-gemini-org="example-block" open>
                <summary className="org-example-summary">
                    <span className="org-example-tag">EXAMPLE</span>
                </summary>
                <pre className="org-example-pre"><code>{codeText}</code></pre>
            </details>
        );
    }

    if (node.blockType === "quote") {
        return (
            <blockquote className="org-quote" data-gemini-org="quote-block">
                {node.content.map((line, idx) => <div key={idx}>{line}</div>)}
            </blockquote>
        );
    }

    if (node.blockType === "verse") {
        return (
            <div className="org-verse" data-gemini-org="verse-block">
                {node.content.map((line, idx) => <div key={idx}>{line}</div>)}
            </div>
        );
    }

    if (node.blockType === "center") {
        return (
            <div className="org-center" data-gemini-org="center-block">
                {node.content.map((line, idx) => <div key={idx}>{line}</div>)}
            </div>
        );
    }

    return (
        <div className="org-src-container">
            <details className="org-src-block" data-gemini-org="src-block" open>
                <summary className="org-src-header" data-gemini-org="src-header">
                    <div className="org-src-meta">
                        <span className="org-src-lang">{langLabel}</span>
                        {node.name && <span className="org-src-name">({node.name})</span>}
                        {node.params && <span className="org-src-params">{node.params}</span>}
                    </div>
                    <button
                        type="button"
                        className={`org-src-copy-btn ${copied ? "copied" : ""}`}
                        onClick={handleCopy}
                        title="Copy source code"
                    >
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </summary>
                <pre className="org-src-pre" data-gemini-org="src-pre">
                    <code>{codeText}</code>
                </pre>
            </details>

            {node.results && (
                <details className="org-results-block" data-gemini-org="results-block" open>
                    <summary className="org-results-summary">
                        <span className="org-results-tag">
                            RESULTS{node.results.name ? `: ${node.results.name}` : ""}
                        </span>
                    </summary>
                    <pre className="org-results-pre">
                        <code>{node.results.content.join("\n")}</code>
                    </pre>
                </details>
            )}
        </div>
    );
}
