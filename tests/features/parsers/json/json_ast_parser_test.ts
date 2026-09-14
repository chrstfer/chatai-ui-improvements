import { assertEquals, assertThrows } from "@std/assert";
import { parseJsonDocument } from "@internal/features/parsers/json";
import type {
    JsonArrayNode,
    JsonObjectNode,
    JsonPrimitiveNode,
    JsonPropertyNode,
} from "@internal/features/parsers/json";

Deno.test("unit: JsonAstParser: parses json object into JsonObjectNode", () => {
    const raw = '{"key": "value"}';
    const doc = parseJsonDocument(raw);
    assertEquals(doc.root.type, "json_object");
});

Deno.test("unit: JsonAstParser: parses json array into JsonArrayNode", () => {
    const raw = '["item1", "item2"]';
    const doc = parseJsonDocument(raw);
    assertEquals(doc.root.type, "json_array");
});

Deno.test("unit: JsonAstParser: parses string primitive into JsonPrimitiveNode", () => {
    const raw = '"hello world"';
    const doc = parseJsonDocument(raw);
    const prim = doc.root as JsonPrimitiveNode;
    assertEquals(prim.rawValue, "hello world");
});

Deno.test("unit: JsonAstParser: parses number primitive into JsonPrimitiveNode", () => {
    const raw = "42.5";
    const doc = parseJsonDocument(raw);
    const prim = doc.root as JsonPrimitiveNode;
    assertEquals(prim.rawValue, 42.5);
});

Deno.test("unit: JsonAstParser: parses boolean primitive into JsonPrimitiveNode", () => {
    const raw = "true";
    const doc = parseJsonDocument(raw);
    const prim = doc.root as JsonPrimitiveNode;
    assertEquals(prim.rawValue, true);
});

Deno.test("unit: JsonAstParser: parses null primitive into JsonPrimitiveNode", () => {
    const raw = "null";
    const doc = parseJsonDocument(raw);
    const prim = doc.root as JsonPrimitiveNode;
    assertEquals(prim.rawValue, null);
});

Deno.test("unit: JsonAstParser: parses nested object properties into JsonPropertyNodes", () => {
    const raw = '{"nested": {"count": 10}}';
    const doc = parseJsonDocument(raw);
    const rootObj = doc.root as JsonObjectNode;
    const nestedProp = rootObj.properties[0];
    const nestedObj = nestedProp.valueNode as JsonObjectNode;
    assertEquals(nestedObj.properties[0].key, "count");
});

Deno.test("unit: JsonAstParser: produces AstRootNode conforming to format json", () => {
    const raw = '{"name": "test"}';
    const doc = parseJsonDocument(raw);
    assertEquals(doc.format, "json");
});

Deno.test("unit: JsonAstParser: throws syntax error on malformed json", () => {
    const raw = "{ invalid json }";
    assertThrows(() => parseJsonDocument(raw));
});
