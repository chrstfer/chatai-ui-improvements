/**
 * Strongly-typed Canonical JSON AST and Tree-Structured Turn IR.
 *
 * Adheres strictly to AstNode base contracts in src/contracts/features/parsers/
 * and ConversationTurnNode contracts in src/contracts/core/.
 */

import type { AstLeafNode, AstNode, AstParentNode, AstRootNode } from "../../../contracts/features/parsers/index.ts";

export type JsonPrimitiveValue = string | number | boolean | null;

/**
 * Leaf primitive node representing string, number, boolean, or null in JSON.
 */
export interface JsonPrimitiveNode extends AstLeafNode {
    readonly type: "json_primitive";
    readonly valueType: "string" | "number" | "boolean" | "null";
    readonly value: string;
    readonly rawValue: JsonPrimitiveValue;
}

/**
 * Property node within a JSON object pairing string key with value node.
 */
export interface JsonPropertyNode extends AstParentNode {
    readonly type: "json_property";
    readonly key: string;
    readonly valueNode: JsonNode;
    readonly children: readonly [JsonNode];
}

/**
 * Object container node holding ordered key-value properties.
 */
export interface JsonObjectNode extends AstParentNode {
    readonly type: "json_object";
    readonly properties: readonly JsonPropertyNode[];
    readonly children: readonly JsonPropertyNode[];
}

/**
 * Array container node holding ordered child element nodes.
 */
export interface JsonArrayNode extends AstParentNode {
    readonly type: "json_array";
    readonly elements: readonly JsonNode[];
    readonly children: readonly JsonNode[];
}

export type JsonNode =
    | JsonPrimitiveNode
    | JsonObjectNode
    | JsonArrayNode
    | JsonPropertyNode;

/**
 * Root AST document node representing parsed JSON.
 */
export interface JsonDocumentNode extends AstRootNode {
    readonly type: "document";
    readonly format: "json";
    readonly root: JsonNode;
    readonly children: readonly [JsonNode];
}

// ============================================================================
// Tree-Structured Intermediate Representation (IR) Contracts
// ============================================================================

export interface JsonSegmentIr {
    readonly type: "prose" | "code-block";
    readonly content: string;
    readonly language?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Canonical Tree-Structured Chat Turn Intermediate Representation.
 * Captures conversation DAG branching with ordered response iterations.
 */
export interface JsonTurnIr {
    /** Unique turn identifier */
    readonly id: string;
    /** Parent turn identifier (null for conversation root) */
    readonly parentId: string | null;
    /** Ordered generation index (0 for first turn, 1+ for regenerations/edits) */
    readonly parentResponseIndex: number;
    /** Settlement timestamp in epoch ms */
    readonly timestamp: number;
    /** Raw user query prompt */
    readonly userQuery: string;
    /** Ordered model response segments */
    readonly modelResponse: readonly JsonSegmentIr[];
    /** Whether turn generation completed normally */
    readonly isCompleted: boolean;
    /** Active branch child turn ID */
    readonly activeChildId?: string;
    /** Ordered child branches for conversation tree rendering */
    readonly children?: readonly JsonTurnIr[];
}
