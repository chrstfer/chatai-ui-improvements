/**
 * JSON AST Parser and Tree-Structured Turn IR Module.
 *
 * Encapsulated feature barrel exposing public facades and domain contracts.
 */

export { parseJsonDocument } from "./parser.ts";
export { buildTurnTree, createJsonTurnIrTranslator, JsonTurnIrTranslator, serializeLinearChat } from "./translator.ts";
export type {
    JsonArrayNode,
    JsonDocumentNode,
    JsonNode,
    JsonObjectNode,
    JsonPrimitiveNode,
    JsonPrimitiveValue,
    JsonPropertyNode,
    JsonSegmentIr,
    JsonTurnIr,
} from "./types.ts";
