/**
 * Renderer Registry Test Suite.
 */

import { assertEquals, assertExists } from "@std/assert";
import { defaultRendererRegistry, RendererRegistry } from "../../src/registries/rendererRegistry.ts";
import type { Renderer } from "../../src/contracts/features/renderers/index.ts";

Deno.test("RendererRegistry: Registers lazy renderers and resolves DocumentViewComponent", async () => {
    const registry = new RendererRegistry();
    const MockViewComponent = () => null;
    const mockRenderer: Renderer = {
        id: "mockview",
        name: "Mock View",
        view: MockViewComponent,
    };

    assertEquals(registry.has("mockview"), false);
    registry.registerLazy({
        formatId: "mockview",
        load: async () => mockRenderer,
    });
    assertEquals(registry.has("mockview"), true);

    const loaded = await registry.get("mockview");
    assertExists(loaded);
    assertEquals(loaded.id, "mockview");
    assertEquals(loaded.view, MockViewComponent);
});

Deno.test("RendererRegistry: defaultRendererRegistry contains lazy Org renderer", async () => {
    assertEquals(defaultRendererRegistry.has("org"), true);
    const orgRenderer = await defaultRendererRegistry.get("org");
    assertExists(orgRenderer);
    assertEquals(orgRenderer.id, "org");
});
