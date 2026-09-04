/**
 * Org-Mode Drawer (:PROPERTIES:, :LOGBOOK:) Component
 */

import { OrgDrawerNode } from "../types/ast.ts";
import { InlineText } from "./InlineText.tsx";

interface DrawerProps {
    node: OrgDrawerNode;
}

export function Drawer({ node }: DrawerProps) {
    return (
        <details className="org-drawer" data-gemini-org="drawer" open>
            <summary className="org-drawer-summary">
                <span className="org-drawer-tag">:{node.name}:</span>
            </summary>
            <div className="org-drawer-body">
                <table className="org-drawer-table">
                    <tbody>
                        {node.entries.map((entry, idx) => (
                            <tr key={idx}>
                                {entry.type === "kv"
                                    ? (
                                        <>
                                            <td className="org-prop-key">:{entry.key}:</td>
                                            <td className="org-prop-val">
                                                <InlineText text={entry.val || ""} />
                                            </td>
                                        </>
                                    )
                                    : (
                                        <td colSpan={2} className="org-prop-raw">
                                            <InlineText text={entry.raw || ""} />
                                        </td>
                                    )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </details>
    );
}
