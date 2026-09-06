/**
 * Universal Outline Folding and Render Mode UI State Model
 * UI interaction behaviors for multi-level hierarchical outline cycling.
 */

export type OutlineFoldState = "folded" | "children" | "subtree";
export type RenderMode = "rendered" | "raw";

/**
 * Computes the next local outline fold state for a UI section or node.
 * For leaf nodes (no child sections), cycles between "folded" and "subtree" (expanded).
 * For branch nodes (with child sections), cycles "folded" -> "children" -> "subtree" -> "folded".
 */
export function nextLocalFoldState(
    current: OutlineFoldState,
    hasChildren: boolean,
): OutlineFoldState {
    if (!hasChildren) {
        return current === "folded" ? "subtree" : "folded";
    }

    switch (current) {
        case "folded":
            return "children";
        case "children":
            return "subtree";
        case "subtree":
        default:
            return "folded";
    }
}

/**
 * Computes the next global or message-level fold state across an entire document,
 * conversation turn, or DOM outline tree.
 * Cycles "folded" -> "children" -> "subtree" -> "folded".
 */
export function nextGlobalFoldState(current: OutlineFoldState): OutlineFoldState {
    switch (current) {
        case "folded":
            return "children";
        case "children":
            return "subtree";
        case "subtree":
        default:
            return "folded";
    }
}

/**
 * Cycles to the next render mode (e.g. "rendered" <-> "raw").
 */
export function nextRenderMode(current: RenderMode): RenderMode {
    return current === "rendered" ? "raw" : "rendered";
}
