/**
 * Canonical JSON AST Parser.
 *
 * Implements headless recursive AST parser converting raw JSON text
 * into a strongly-typed JsonDocumentNode conforming to AstRootNode.
 */

import type {
    JsonArrayNode,
    JsonDocumentNode,
    JsonNode,
    JsonObjectNode,
    JsonPrimitiveNode,
    JsonPropertyNode,
} from "./types.ts";

function transformValue(val: unknown): JsonNode {
    if (val === null) {
        return {
            type: "json_primitive",
            valueType: "null",
            value: "null",
            rawValue: null,
        } satisfies JsonPrimitiveNode;
    }

    if (typeof val === "boolean") {
        return {
            type: "json_primitive",
            valueType: "boolean",
            value: String(val),
            rawValue: val,
        } satisfies JsonPrimitiveNode;
    }

    if (typeof val === "number") {
        return {
            type: "json_primitive",
            valueType: "number",
            value: String(val),
            rawValue: val,
        } satisfies JsonPrimitiveNode;
    }

    if (typeof val === "string") {
        return {
            type: "json_primitive",
            valueType: "string",
            value: val,
            rawValue: val,
        } satisfies JsonPrimitiveNode;
    }

    if (Array.isArray(val)) {
        const elements = val.map(transformValue);
        return {
            type: "json_array",
            elements,
            children: elements,
        } satisfies JsonArrayNode;
    }

    if (typeof val === "object") {
        const properties: JsonPropertyNode[] = Object.entries(val).map(([key, childVal]) => {
            const valueNode = transformValue(childVal);
            return {
                type: "json_property",
                key,
                valueNode,
                children: [valueNode],
            };
        });

        return {
            type: "json_object",
            properties,
            children: properties,
        } satisfies JsonObjectNode;
    }

    // Fallback for unexpected types (undefined, symbols)
    return {
        type: "json_primitive",
        valueType: "null",
        value: "null",
        rawValue: null,
    } satisfies JsonPrimitiveNode;
}

/**
 * Parses raw JSON string into a structured JsonDocumentNode AST.
 * Throws SyntaxError if the input text is not valid JSON.
 */
export function parseJsonDocument(rawText: string): JsonDocumentNode {
    const parsed = JSON.parse(rawText);
    const root = transformValue(parsed);

    return {
        type: "document",
        format: "json",
        root,
        children: [root],
    };
}
