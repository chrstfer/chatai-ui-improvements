/**
 * Contracts Hierarchy & Eager Matchers Test Suite.
 */

import { assertEquals, assertExists } from "@std/assert";
import type {
    ConversationTurnNode,
    ExtensionRuntimeEnvironment,
    ExtensionSettings,
    ResponseSegment,
    Runlevel,
    SystemLifecycleState,
    UserSettings,
} from "../../src/contracts/core/index.ts";
import type {
    ChatAdapterDefinition,
    ChatColumnBounds,
    DiscoveredBlockRef,
    HostLayoutController,
    HostThemeAuthority,
    SettlementObserver,
    SettlementObserverCallbacks,
    SettlementState,
    SiteAdapter,
    ThemeMode,
} from "../../src/contracts/chats/index.ts";
import type { FormatMatcher } from "../../src/contracts/features/matchers/index.ts";
import type { AstIrTranslator, AstNode, Parser } from "../../src/contracts/features/parsers/index.ts";
import type {
    DocumentViewComponent,
    DocumentViewProps,
    Renderer,
} from "../../src/contracts/features/renderers/index.ts";
import type { ConversationMetadata, ConversationSerializer } from "../../src/contracts/features/serializers/index.ts";

Deno.test("Contracts Hierarchy: Submodule barrels export valid TypeScript types", () => {
    // Type assignability reality check across submodule boundaries
    const segment: ResponseSegment = { type: "code-block", content: "* Headline", language: "org" };
    const turn: ConversationTurnNode = {
        id: "turn-test",
        parentTurnId: null,
        timestamp: 12345,
        userQuery: "Hello",
        modelResponse: [segment],
        isCompleted: true,
    };

    const parser: Parser<string> = {
        id: "test",
        name: "Test",
        parse: (t) => t,
    };

    const renderer: Renderer = {
        id: "test",
        name: "Test",
        view: () => null,
    };

    const serializer: ConversationSerializer = {
        formatId: "test",
        label: "Test",
        fileExtension: "txt",
        outputMimetype: "text/plain",
        serializeTurn: (t) => t.userQuery,
        serializeConversation: (ts) => ts.map((t) => t.userQuery).join("\n"),
    };

    assertEquals(turn.id, "turn-test");
    assertEquals(turn.modelResponse[0].type, "code-block");
    assertEquals(parser.id, "test");
    assertEquals(renderer.id, "test");
    assertEquals(serializer.formatId, "test");
});
