/**
 * Org-Mode List Component
 */

import { OrgListNode } from "../types/ast.ts";
import { ListItem } from "./ListItem.tsx";

interface ListProps {
    node: OrgListNode;
    onListChange?: () => void;
}

export function List({ node, onListChange }: ListProps) {
    const Tag = node.isOrdered ? "ol" : "ul";

    return (
        <Tag className="org-list" data-gemini-org="list" data-indent={node.indent}>
            {node.items.map((item, index) => (
                <ListItem
                    key={index}
                    item={item}
                    onChildChange={onListChange}
                />
            ))}
        </Tag>
    );
}
