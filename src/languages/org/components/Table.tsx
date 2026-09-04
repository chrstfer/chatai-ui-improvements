/**
 * Org-Mode Table Component
 */

import { OrgTableNode } from "../types/ast.ts";
import { InlineText } from "./InlineText.tsx";

interface TableProps {
    node: OrgTableNode;
}

export function Table({ node }: TableProps) {
    const dividerIndices = node.rows
        .map((r, i) => (r.isDivider ? i : -1))
        .filter((i) => i !== -1);

    const isHeaderRow = (rIdx: number): boolean => {
        if (dividerIndices.length === 0) return false;
        if (dividerIndices[0] === 0) {
            return dividerIndices.length > 1 && rIdx > dividerIndices[0] && rIdx < dividerIndices[1];
        }
        return rIdx < dividerIndices[0];
    };

    return (
        <div className="org-table-wrapper" data-gemini-org="table-wrapper">
            <table className="org-table" data-gemini-org="table">
                <tbody>
                    {node.rows.map((row, rIdx) => {
                        if (row.isDivider) return null;

                        const isHeader = isHeaderRow(rIdx);
                        const Tag = isHeader ? "th" : "td";

                        return (
                            <tr key={rIdx} className={isHeader ? "org-table-header-row" : ""}>
                                {row.cells.map((cell, cIdx) => {
                                    const isNum = /^-?\d+(?:\.\d+)?%?$|^\$?\d+(?:,\d{3})*(?:\.\d+)?$/.test(cell);
                                    return (
                                        <Tag
                                            key={cIdx}
                                            className={isNum ? "org-table-num" : ""}
                                        >
                                            <InlineText text={cell} />
                                        </Tag>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
