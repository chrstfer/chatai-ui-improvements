/**
 * Serializer Registry Test Suite.
 */

import { assertEquals } from "@std/assert";
import { SerializerRegistry } from "../../src/registries/serializerRegistry.ts";
import type { ConversationSerializer } from "../../src/contracts/features/serializers/index.ts";

Deno.test("SerializerRegistry: Registers and retrieves conversation serializers", async () => {
    const registry = new SerializerRegistry();
    const mockSerializer: ConversationSerializer = {
        formatId: "org",
        label: "Org Mode",
        fileExtension: "org",
        outputMimetype: "text/x-org",
        serializeTurn: (turn) => `* Turn: ${turn.userQuery}`,
        serializeConversation: (turns) => turns.map((t) => `* Turn: ${t.userQuery}`).join("\n"),
    };

    registry.registerLazy({
        formatId: "org",
        label: "Org Mode",
        load: async () => mockSerializer,
    });

    const loaded = await registry.get("org");
    assertEquals(loaded, mockSerializer);

    const all = await registry.getAll();
    assertEquals(all.length, 1);
    assertEquals(all[0].formatId, "org");
});
