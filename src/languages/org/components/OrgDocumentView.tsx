/**
 * Top-Level Org Document View Component
 */

import { OrgContentNode, OrgDocument } from "../types/ast.ts";
import { Drawer } from "./Drawer.tsx";
import { InlineText } from "./InlineText.tsx";
import { Latex } from "./Latex.tsx";
import { List } from "./List.tsx";
import { Section } from "./Section.tsx";
import { SrcBlock } from "./SrcBlock.tsx";
import { Table } from "./Table.tsx";

interface OrgDocumentViewProps {
    doc: OrgDocument;
    forceFoldAll?: boolean;
}

function renderPreambleNode(node: OrgContentNode, index: number) {
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

export function OrgDocumentView({ doc, forceFoldAll }: OrgDocumentViewProps) {
    return (
        <div className="org-document-root" data-gemini-org="document-root">
            {doc.metadata.length > 0 && (
                <div className="org-meta-banner" data-gemini-org="meta-banner">
                    {doc.metadata.map((m, idx) => (
                        <div key={idx} className="org-meta-row" data-gemini-org="meta-row">
                            <span className="org-meta-key">#+{m.key}:</span>{" "}
                            <span className="org-meta-val">
                                <InlineText text={m.val} />
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {doc.preamble.length > 0 && (
                <div className="org-preamble" data-gemini-org="preamble">
                    {doc.preamble.map((n, idx) => renderPreambleNode(n, idx))}
                </div>
            )}

            {doc.sections.map((sec, idx) => (
                <Section
                    key={idx}
                    section={sec}
                    forceFoldState={forceFoldAll}
                />
            ))}
        </div>
    );
}
