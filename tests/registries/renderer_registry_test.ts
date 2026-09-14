/**
 * Renderer Registry Test Suite.
 */

import { assertEquals } from "@std/assert";
import { defaultRendererRegistry, RendererRegistry } from "../../src/registries/rendererRegistry.ts";
import type { Renderer } from "../../src/contracts/features/renderers/index.ts";

const MockViewComponent = () => null;
const mockRenderer: Renderer = {
    id: "mockview",
    name: "Mock View",
    view: MockViewComponent,
};

Deno.test("unit: RendererRegistry: has returns false for unregistered format", () => {
    const registry = new RendererRegistry();
    const result = registry.has("mockview");
    assertEquals(result, false);
});

Deno.test("unit: RendererRegistry: registers lazy renderer definition", () => {
    const registry = new RendererRegistry();
    registry.registerLazy({
        formatId: "mockview",
        load: () => Promise.resolve(mockRenderer),
    });
    const result = registry.has("mockview");
    assertEquals(result, true);
});

Deno.test("unit: RendererRegistry: get resolves registered renderer", async () => {
    const registry = new RendererRegistry();
    registry.registerLazy({
        formatId: "mockview",
        load: () => Promise.resolve(mockRenderer),
    });
    const loaded = await registry.get("mockview");
    assertEquals(loaded?.id, "mockview");
});

Deno.test("unit: RendererRegistry: defaultRendererRegistry contains lazy Org renderer", () => {
    const exists = defaultRendererRegistry.has("org");
    assertEquals(exists, true);
});

Deno.test("unit: RendererRegistry: defaultRendererRegistry resolves Org renderer with correct formatId", async () => {
    const orgRenderer = await defaultRendererRegistry.get("org");
    assertEquals(orgRenderer?.id, "org");
});
