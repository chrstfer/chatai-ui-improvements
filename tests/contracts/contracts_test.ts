/**
 * Contracts Hierarchy & Eager Matchers Test Suite.
 */

import { assertEquals } from "@std/assert";
import type { ConversationTurnNode, ResponseSegment } from "../../src/contracts/core/index.ts";
import type { Parser } from "../../src/contracts/features/parsers/index.ts";
import type { Renderer } from "../../src/contracts/features/renderers/index.ts";
import type { ConversationSerializer } from "../../src/contracts/features/serializers/index.ts";

Deno.test("unit: ContractsHierarchy: core submodule exports valid ConversationTurnNode contract", () => {
    // Arrange & Act
    const segment: ResponseSegment = { type: "code-block", content: "* Headline", language: "org" };
    const turn: ConversationTurnNode = {
        id: "turn-test",
        parentTurnId: null,
        timestamp: 12345,
        userQuery: "Hello",
        modelResponse: [segment],
        isCompleted: true,
    };

    // Assert
    assertEquals(turn.id, "turn-test");
});

Deno.test("unit: ContractsHierarchy: features submodule exports valid Parser contract", () => {
    // Arrange & Act
    const parser: Parser<string> = {
        id: "test",
        name: "Test",
        parse: (t) => t,
    };

    // Assert
    assertEquals(parser.id, "test");
});

Deno.test("unit: ContractsHierarchy: features submodule exports valid Renderer contract", () => {
    // Arrange & Act
    const renderer: Renderer = {
        id: "test",
        name: "Test",
        view: () => null,
    };

    // Assert
    assertEquals(renderer.id, "test");
});

Deno.test("unit: ContractsHierarchy: features submodule exports valid ConversationSerializer contract", () => {
    // Arrange & Act
    const serializer: ConversationSerializer = {
        formatId: "test",
        label: "Test",
        fileExtension: "txt",
        outputMimetype: "text/plain",
        serializeTurn: (t) => t.userQuery,
        serializeConversation: (ts) => ts.map((t) => t.userQuery).join("\n"),
    };

    // Assert
    assertEquals(serializer.formatId, "test");
});
