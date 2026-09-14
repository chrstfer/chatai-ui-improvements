/**
 * Canonical JSON Turn IR Translator and Tree Reconstructor.
 *
 * Implements AstIrTranslator<ConversationTurnNode, JsonTurnIr> contract:
 * - Translates atomic ConversationTurnNodes to tree-structured JsonTurnIr.
 * - Reconstructs nested chat DAG tree from flat turn arrays.
 * - Serializes branching conversations into linear chat histories along active paths or target leaf IDs.
 */

import type { ConversationTurnNode, ResponseSegment } from "@internal/contracts/core";
import type { AstIrTranslator } from "@internal/contracts/features/parsers";
import type { JsonSegmentIr, JsonTurnIr } from "./types.ts";

/**
 * Headless IR Translator between ConversationTurnNode and JsonTurnIr.
 */
export class JsonTurnIrTranslator implements AstIrTranslator<ConversationTurnNode, JsonTurnIr> {
    toIr(node: ConversationTurnNode): JsonTurnIr {
        const segments: JsonSegmentIr[] = node.modelResponse.map((seg) => ({
            type: seg.type,
            content: seg.content,
            language: seg.language,
            metadata: seg.metadata,
        }));

        return {
            id: node.id,
            parentId: node.parentTurnId,
            parentResponseIndex: node.parentResponseIndex ?? 0,
            timestamp: node.timestamp,
            userQuery: node.userQuery,
            modelResponse: segments,
            isCompleted: node.isCompleted,
            activeChildId: node.activeChildId,
        };
    }

    fromIr(ir: JsonTurnIr): ConversationTurnNode {
        const segments: ResponseSegment[] = ir.modelResponse.map((seg) => ({
            type: seg.type,
            content: seg.content,
            language: seg.language,
            metadata: seg.metadata,
        }));

        return {
            id: ir.id,
            parentTurnId: ir.parentId,
            parentResponseIndex: ir.parentResponseIndex,
            timestamp: ir.timestamp,
            userQuery: ir.userQuery,
            modelResponse: segments,
            isCompleted: ir.isCompleted,
            activeChildId: ir.activeChildId,
        };
    }
}

/**
 * Factory creating a fresh instance of JsonTurnIrTranslator.
 */
export function createJsonTurnIrTranslator(): JsonTurnIrTranslator {
    return new JsonTurnIrTranslator();
}

interface MutableJsonTurnIr extends JsonTurnIr {
    children?: MutableJsonTurnIr[];
}

/**
 * Reconstructs a hierarchical conversation forest from a flat list of turn nodes.
 * Orders sibling children chronologically and by parentResponseIndex.
 */
export function buildTurnTree(turns: readonly ConversationTurnNode[]): JsonTurnIr[] {
    const translator = createJsonTurnIrTranslator();
    const map = new Map<string, MutableJsonTurnIr>();

    for (const turn of turns) {
        const ir: MutableJsonTurnIr = {
            ...translator.toIr(turn),
            children: [],
        };
        map.set(turn.id, ir);
    }

    const roots: MutableJsonTurnIr[] = [];

    for (const turn of turns) {
        const current = map.get(turn.id)!;
        if (turn.parentTurnId && map.has(turn.parentTurnId)) {
            const parent = map.get(turn.parentTurnId)!;
            parent.children!.push(current);
        } else {
            roots.push(current);
        }
    }

    function sortChildren(node: MutableJsonTurnIr): void {
        if (!node.children || node.children.length === 0) return;

        node.children.sort((a, b) => {
            if (a.parentResponseIndex !== b.parentResponseIndex) {
                return a.parentResponseIndex - b.parentResponseIndex;
            }
            return a.timestamp - b.timestamp;
        });

        for (const child of node.children) {
            sortChildren(child);
        }
    }

    roots.sort((a, b) => a.timestamp - b.timestamp);
    for (const root of roots) {
        sortChildren(root);
    }

    return roots;
}

/**
 * Serializes a conversation turn tree into a linear chat history.
 * If leafTurnId is provided, traces the linear lineage from the root down to that specific leaf.
 * If omitted, follows the activeChildId path down to the terminal branch.
 */
export function serializeLinearChat(
    turns: readonly ConversationTurnNode[],
    leafTurnId?: string,
): ConversationTurnNode[] {
    if (turns.length === 0) return [];

    const turnMap = new Map<string, ConversationTurnNode>();
    for (const turn of turns) {
        turnMap.set(turn.id, turn);
    }

    // 1. If targeting a specific leaf turn ID, walk up the parent tree to root
    if (leafTurnId) {
        const chain: ConversationTurnNode[] = [];
        let curr: ConversationTurnNode | undefined = turnMap.get(leafTurnId);
        while (curr) {
            chain.push(curr);
            curr = curr.parentTurnId ? turnMap.get(curr.parentTurnId) : undefined;
        }
        return chain.reverse();
    }

    // 2. Otherwise, find root and follow activeChildId downwards
    let root = turns.find((t) => t.parentTurnId === null || !turnMap.has(t.parentTurnId));
    if (!root) {
        root = turns[0];
    }

    const chain: ConversationTurnNode[] = [];
    let curr: ConversationTurnNode | undefined = root;

    while (curr) {
        chain.push(curr);

        if (curr.activeChildId && turnMap.has(curr.activeChildId)) {
            curr = turnMap.get(curr.activeChildId);
            continue;
        }

        // If no activeChildId, find children and pick the one with highest parentResponseIndex
        const children = turns.filter((t) => t.parentTurnId === curr!.id);
        if (children.length === 0) break;

        children.sort((a, b) => {
            const indexA = a.parentResponseIndex ?? 0;
            const indexB = b.parentResponseIndex ?? 0;
            if (indexA !== indexB) {
                return indexB - indexA; // highest index first
            }
            return b.timestamp - a.timestamp;
        });

        curr = children[0];
    }

    return chain;
}
