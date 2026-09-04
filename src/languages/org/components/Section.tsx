/**
 * Collapsible Org-Mode Outline Section Component
 */

import { useEffect, useState } from "preact/hooks";
import { serializeOrgSection } from "../parser/document-parser.ts";
import { OrgContentNode, OrgSectionNode } from "../types/ast.ts";
import { Drawer } from "./Drawer.tsx";
import { InlineText } from "./InlineText.tsx";
import { Latex } from "./Latex.tsx";
import { List } from "./List.tsx";
import { SrcBlock } from "./SrcBlock.tsx";
import { Table } from "./Table.tsx";

interface SectionProps {
    section: OrgSectionNode;
    forceFoldState?: boolean;
}

function renderContentNode(node: OrgContentNode, index: number) {
    switch (node.type) {
        case "paragraph":
            if (!node.text.trim()) return null;
            return (
                <p key={index} className="org-paragraph" data-gemini-org="paragraph">
                    <InlineText text={node.text} />
                </p>
            );

        case "blank_line":
            return <div key={index} className="org-blank-line" data-gemini-org="blank-line" />;

        case "horizontal_rule":
            return <hr key={index} className="org-hr" data-gemini-org="hr" />;

        case "src_block":
            return <SrcBlock key={index} node={node} />;

        case "latex_block":
            return (
                <div key={index} className="org-latex-block" data-gemini-org="latex-block">
                    <Latex math={node.content} display />
                </div>
            );

        case "drawer":
            return <Drawer key={index} node={node} />;

        case "table":
            return <Table key={index} node={node} />;

        case "list":
            return <List key={index} node={node} />;

        default:
            return null;
    }
}

export function Section({ section, forceFoldState }: SectionProps) {
    const [isFolded, setIsFolded] = useState(false);
    const [copied, setCopied] = useState(false);
    const { heading, body, children } = section;
    const level = heading.level;

    useEffect(() => {
        if (typeof forceFoldState === "boolean") {
            setIsFolded(forceFoldState);
        }
    }, [forceFoldState]);

    const toggleFold = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest("a, button, input, .org-checkbox, .org-src-copy-btn, .org-subtree-copy-btn")) {
            if (!target.closest(".org-fold-btn")) return;
        }
        setIsFolded(!isFolded);
    };

    const handleCopySubtree = async (e: MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const subtreeText = section.rawSubtree || serializeOrgSection(section);
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(subtreeText);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch (err) {
            console.error("[GeminiOrgMod] Failed to copy subtree:", err);
        }
    };

    return (
        <div
            className={`org-section org-sec-${level} ${isFolded ? "org-folded" : ""}`}
            data-gemini-org="section"
            data-level={level}
        >
            <div
                className={`org-heading org-h${level}`}
                data-gemini-org="heading"
                data-level={level}
                onClick={toggleFold}
            >
                <button
                    type="button"
                    className="org-fold-btn"
                    data-gemini-org="fold-btn"
                    aria-label="Toggle section"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsFolded(!isFolded);
                    }}
                >
                    <span className="org-fold-icon">{isFolded ? "▶" : "▼"}</span>
                </button>

                <span className="org-heading-title" data-gemini-org="heading-title">
                    {heading.status && (
                        <span className={`org-status org-status-${heading.status}`} data-gemini-org="status">
                            {heading.status}
                        </span>
                    )}
                    {heading.priority && (
                        <span className={`org-priority org-priority-${heading.priority}`} data-gemini-org="priority">
                            [#{heading.priority}]
                        </span>
                    )}
                    {heading.statsCookie && (
                        <span className="org-stats-cookie" data-gemini-org="stats-cookie">
                            {heading.statsCookie}
                        </span>
                    )}
                    <InlineText text={heading.title} />
                </span>

                <span className="org-heading-actions" data-gemini-org="heading-actions">
                    {heading.tags.length > 0 && (
                        <span className="org-tags" data-gemini-org="tags">
                            {heading.tags.map((t, idx) => (
                                <span key={idx} className="org-tag" data-gemini-org="tag">
                                    :{t}:
                                </span>
                            ))}
                        </span>
                    )}
                    <button
                        type="button"
                        className={`org-subtree-copy-btn ${copied ? "copied" : ""}`}
                        data-gemini-org="subtree-copy-btn"
                        title="Copy subtree"
                        aria-label="Copy subtree"
                        onClick={handleCopySubtree}
                    >
                        <svg
                            className="org-copy-icon"
                            viewBox="0 0 16 16"
                            width="11"
                            height="11"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z" />
                            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z" />
                        </svg>
                        <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                </span>
            </div>

            {!isFolded && (
                <div
                    className="org-section-content"
                    data-gemini-org="section-content"
                    data-level={level}
                >
                    {body.map((n, idx) => renderContentNode(n, idx))}
                    {children.map((c, idx) => (
                        <Section
                            key={idx}
                            section={c}
                            forceFoldState={forceFoldState}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
