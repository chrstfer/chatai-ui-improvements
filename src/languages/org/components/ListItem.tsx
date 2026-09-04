/**
 * Hierarchical List Item Component with Tri-State [ ], [-], [X] Checkbox Logic
 */

import { useState } from "preact/hooks";
import { OrgCheckboxState, OrgListItemNode } from "../types/ast.ts";
import { InlineText } from "./InlineText.tsx";

interface ListItemProps {
    item: OrgListItemNode;
    onChildChange?: () => void;
}

export function ListItem({ item, onChildChange }: ListItemProps) {
    const [localCheck, setLocalCheck] = useState<OrgCheckboxState>(item.checkbox);
    const [children, setChildren] = useState<OrgListItemNode[]>(item.children);

    const hasChildren = children.length > 0;
    const hasCheckbox = item.checkbox !== "none";

    // Helper: compute aggregate tri-state from children
    const getAggregateState = (childList: OrgListItemNode[]): OrgCheckboxState => {
        if (childList.length === 0) return localCheck;
        const checkCount = childList.filter((c) => c.checkbox === "checked").length;
        const partialCount = childList.filter((c) => c.checkbox === "partial").length;

        if (checkCount === childList.length) return "checked";
        if (checkCount === 0 && partialCount === 0) return "unchecked";
        return "partial";
    };

    const currentState = hasChildren && hasCheckbox ? getAggregateState(children) : localCheck;

    const setAllDescendants = (nodes: OrgListItemNode[], state: OrgCheckboxState): OrgListItemNode[] => {
        return nodes.map((node) => ({
            ...node,
            checkbox: node.checkbox !== "none" ? state : "none",
            children: setAllDescendants(node.children, state),
        }));
    };

    const handleCheckboxToggle = () => {
        const nextState: OrgCheckboxState = currentState === "checked" ? "unchecked" : "checked";
        setLocalCheck(nextState);
        item.checkbox = nextState;

        if (hasChildren) {
            const updatedChildren = setAllDescendants(children, nextState);
            setChildren(updatedChildren);
            item.children = updatedChildren;
        }

        if (onChildChange) {
            onChildChange();
        }
    };

    const handleNestedChildChange = (childIndex: number, newChildNode: OrgListItemNode) => {
        const updatedChildren = [...children];
        updatedChildren[childIndex] = newChildNode;
        setChildren(updatedChildren);
        item.children = updatedChildren;

        const aggregate = getAggregateState(updatedChildren);
        setLocalCheck(aggregate);
        item.checkbox = aggregate;

        if (onChildChange) {
            onChildChange();
        }
    };

    return (
        <li
            className={`org-list-item ${hasCheckbox ? "org-checkbox-item" : ""} ${item.term ? "org-desc-item" : ""}`}
            data-gemini-org={hasCheckbox ? "checkbox-item" : "list-item"}
        >
            {hasCheckbox && (
                <input
                    type="checkbox"
                    className="org-checkbox"
                    checked={currentState === "checked"}
                    ref={(el) => {
                        if (el) el.indeterminate = currentState === "partial";
                    }}
                    data-indeterminate={currentState === "partial" ? "true" : undefined}
                    onChange={handleCheckboxToggle}
                />
            )}

            <span
                className={`org-list-item-content ${hasCheckbox ? "org-checkbox-label" : ""} ${
                    currentState === "checked" ? "org-checked" : ""
                }`}
                onClick={hasCheckbox ? handleCheckboxToggle : undefined}
            >
                {item.term && (
                    <strong className="org-desc-term">
                        <InlineText text={item.term} />:
                    </strong>
                )}
                <InlineText text={item.text} />
            </span>

            {hasChildren && (
                <ul className="org-list org-nested-list">
                    {children.map((child, idx) => (
                        <ListItem
                            key={idx}
                            item={child}
                            onChildChange={() => handleNestedChildChange(idx, child)}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}
