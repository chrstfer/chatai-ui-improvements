import { assertEquals } from "@std/assert";
import type { ConversationTurnNode } from "@internal/contracts/core";
import { buildTurnTree, createJsonTurnIrTranslator, serializeLinearChat } from "@internal/features/parsers/json";
import type { JsonTurnIr } from "@internal/features/parsers/json";

const sampleTurn: ConversationTurnNode = {
    id: "turn-1",
    parentTurnId: null,
    parentResponseIndex: 0,
    timestamp: 1700000000000,
    userQuery: "What is 2 + 2?",
    modelResponse: [
        { type: "prose", content: "2 + 2 equals 4." },
        { type: "code-block", language: "python", content: "print(2 + 2)" },
    ],
    isCompleted: true,
    activeChildId: "turn-2",
};

Deno.test("unit: JsonTurnIrTranslator: translates ConversationTurnNode to JsonTurnIr", () => {
    const translator = createJsonTurnIrTranslator();
    const ir = translator.toIr(sampleTurn);
    assertEquals(ir.id, "turn-1");
});

Deno.test("unit: JsonTurnIrTranslator: translates JsonTurnIr back to ConversationTurnNode", () => {
    const translator = createJsonTurnIrTranslator();
    const ir = translator.toIr(sampleTurn);
    const roundtrip = translator.fromIr(ir);
    assertEquals(roundtrip.id, sampleTurn.id);
});

Deno.test("unit: JsonTurnIrTranslator: preserves parentResponseIndex across translation", () => {
    const regenTurn: ConversationTurnNode = {
        ...sampleTurn,
        id: "turn-1-regen",
        parentResponseIndex: 2,
    };
    const translator = createJsonTurnIrTranslator();
    const ir = translator.toIr(regenTurn);
    assertEquals(ir.parentResponseIndex, 2);
});

Deno.test("unit: JsonTurnIrTranslator: defaults parentResponseIndex to zero when omitted", () => {
    const legacyTurn: ConversationTurnNode = {
        id: "turn-legacy",
        parentTurnId: null,
        timestamp: 1700000000000,
        userQuery: "Hello",
        modelResponse: [{ type: "prose", content: "Hi" }],
        isCompleted: true,
    };
    const translator = createJsonTurnIrTranslator();
    const ir = translator.toIr(legacyTurn);
    assertEquals(ir.parentResponseIndex, 0);
});

Deno.test("unit: JsonTurnIrTranslator: maps parentTurnId to parentId in JsonTurnIr", () => {
    const childTurn: ConversationTurnNode = {
        ...sampleTurn,
        id: "turn-2",
        parentTurnId: "turn-1",
    };
    const translator = createJsonTurnIrTranslator();
    const ir = translator.toIr(childTurn);
    assertEquals(ir.parentId, "turn-1");
});

Deno.test("unit: JsonTurnIrTranslator: preserves modelResponse prose and code block segments", () => {
    const translator = createJsonTurnIrTranslator();
    const ir = translator.toIr(sampleTurn);
    assertEquals(ir.modelResponse.length, 2);
});

Deno.test("unit: JsonTurnIrTranslator: builds hierarchical tree from flat turn array", () => {
    const turns: ConversationTurnNode[] = [
        sampleTurn,
        {
            id: "turn-2",
            parentTurnId: "turn-1",
            parentResponseIndex: 0,
            timestamp: 1700000010000,
            userQuery: "And 3 + 3?",
            modelResponse: [{ type: "prose", content: "6" }],
            isCompleted: true,
        },
    ];
    const tree = buildTurnTree(turns);
    assertEquals(tree[0].children?.length, 1);
});

Deno.test("unit: JsonTurnIrTranslator: orders sibling children by parentResponseIndex", () => {
    const turns: ConversationTurnNode[] = [
        sampleTurn,
        {
            id: "turn-2-regen",
            parentTurnId: "turn-1",
            parentResponseIndex: 1,
            timestamp: 1700000020000,
            userQuery: "Tell me more",
            modelResponse: [{ type: "prose", content: "Second attempt" }],
            isCompleted: true,
        },
        {
            id: "turn-2-first",
            parentTurnId: "turn-1",
            parentResponseIndex: 0,
            timestamp: 1700000010000,
            userQuery: "Tell me more",
            modelResponse: [{ type: "prose", content: "First attempt" }],
            isCompleted: true,
        },
    ];
    const tree = buildTurnTree(turns);
    const firstChild = tree[0].children?.[0];
    assertEquals(firstChild?.id, "turn-2-first");
});

Deno.test("unit: JsonTurnIrTranslator: serializes linear chat along active child path", () => {
    const turn1: ConversationTurnNode = {
        ...sampleTurn,
        id: "turn-1",
        activeChildId: "turn-2b",
    };
    const turn2a: ConversationTurnNode = {
        id: "turn-2a",
        parentTurnId: "turn-1",
        parentResponseIndex: 0,
        timestamp: 1700000010000,
        userQuery: "Option A",
        modelResponse: [{ type: "prose", content: "A" }],
        isCompleted: true,
    };
    const turn2b: ConversationTurnNode = {
        id: "turn-2b",
        parentTurnId: "turn-1",
        parentResponseIndex: 1,
        timestamp: 1700000020000,
        userQuery: "Option B",
        modelResponse: [{ type: "prose", content: "B" }],
        isCompleted: true,
    };
    const linear = serializeLinearChat([turn1, turn2a, turn2b]);
    assertEquals(linear[1].id, "turn-2b");
});

Deno.test("unit: JsonTurnIrTranslator: serializes linear chat to target leaf turn id", () => {
    const turn1: ConversationTurnNode = {
        ...sampleTurn,
        id: "turn-1",
        activeChildId: "turn-2b",
    };
    const turn2a: ConversationTurnNode = {
        id: "turn-2a",
        parentTurnId: "turn-1",
        parentResponseIndex: 0,
        timestamp: 1700000010000,
        userQuery: "Option A",
        modelResponse: [{ type: "prose", content: "A" }],
        isCompleted: true,
    };
    const turn2b: ConversationTurnNode = {
        id: "turn-2b",
        parentTurnId: "turn-1",
        parentResponseIndex: 1,
        timestamp: 1700000020000,
        userQuery: "Option B",
        modelResponse: [{ type: "prose", content: "B" }],
        isCompleted: true,
    };
    const linear = serializeLinearChat([turn1, turn2a, turn2b], "turn-2a");
    assertEquals(linear[1].id, "turn-2a");
});
