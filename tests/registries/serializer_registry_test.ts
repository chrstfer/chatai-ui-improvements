/**
 * Serializer Registry Test Suite.
 */

import { assertEquals } from "@std/assert";
import { SerializerRegistry } from "@internal/registries";
import type { ConversationSerializer } from "@internal/contracts/features/serializers";

const mockSerializer: ConversationSerializer = {
    formatId: "org",
    label: "Org Mode",
    fileExtension: "org",
    outputMimetype: "text/x-org",
    serializeTurn: (turn) => `* Turn: ${turn.userQuery}`,
    serializeConversation: (turns) => turns.map((t) => `* Turn: ${t.userQuery}`).join("\n"),
};

Deno.test("unit: SerializerRegistry: get returns undefined for unregistered format", async () => {
    const registry = new SerializerRegistry();
    const result = await registry.get("org");
    assertEquals(result, undefined);
});

Deno.test("unit: SerializerRegistry: registers and resolves conversation serializer", async () => {
    const registry = new SerializerRegistry();
    registry.registerLazy({
        formatId: "org",
        label: "Org Mode",
        load: () => Promise.resolve(mockSerializer),
    });
    const loaded = await registry.get("org");
    assertEquals(loaded, mockSerializer);
});

Deno.test("unit: SerializerRegistry: getAll returns registered serializers list", async () => {
    const registry = new SerializerRegistry();
    registry.registerLazy({
        formatId: "org",
        label: "Org Mode",
        load: () => Promise.resolve(mockSerializer),
    });
    const all = await registry.getAll();
    assertEquals(all.length, 1);
});

Deno.test("unit: SerializerRegistry: unregister removes registered serializer", () => {
    const registry = new SerializerRegistry();
    registry.register(mockSerializer);
    const removed = registry.unregister("org");
    assertEquals(removed, true);
});
