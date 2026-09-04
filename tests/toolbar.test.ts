/**
 * Unit Tests for Dynamic and Hotswappable Toolbar Tools
 */

import { assertEquals, assertExists } from "@std/assert";
import { DEFAULT_TOOLBAR_TOOLS, ToolbarContext, ToolbarTool, ToolbarToolRegistry } from "../src/languages/org/index.ts";

Deno.test("ToolbarToolRegistry", async (t) => {
    await t.step("initializes with default tools in proper order", () => {
        const registry = new ToolbarToolRegistry(DEFAULT_TOOLBAR_TOOLS);
        const tools = registry.getAll();
        assertEquals(tools.length, 2);
        assertEquals(tools[0].id, "render-toggle");
        assertEquals(tools[1].id, "fold-toggle");
    });

    await t.step("allows dynamic tool registration and custom ordering", () => {
        const registry = new ToolbarToolRegistry(DEFAULT_TOOLBAR_TOOLS);
        let notified = false;
        const unsubscribe = registry.subscribe(() => {
            notified = true;
        });

        const customTool: ToolbarTool = {
            id: "export-markdown",
            order: 15,
            title: "Export as Markdown",
            render: () => "Export",
        };

        registry.register(customTool);
        assertEquals(notified, true);
        assertEquals(registry.has("export-markdown"), true);

        const tools = registry.getAll();
        assertEquals(tools.length, 3);
        assertEquals(tools[0].id, "render-toggle"); // order 10
        assertEquals(tools[1].id, "export-markdown"); // order 15
        assertEquals(tools[2].id, "fold-toggle"); // order 20

        unsubscribe();
    });

    await t.step("allows dynamic tool hotswapping and unregistration", () => {
        const registry = new ToolbarToolRegistry(DEFAULT_TOOLBAR_TOOLS);

        // Hotswap fold-toggle with customized behavior
        const customFoldToggle: ToolbarTool = {
            id: "fold-toggle",
            order: 20,
            title: () => "Customized Folder",
        };
        registry.register(customFoldToggle);

        const tool = registry.get("fold-toggle");
        assertExists(tool);
        assertEquals(
            typeof tool.title === "function" ? tool.title({} as unknown as ToolbarContext) : tool.title,
            "Customized Folder",
        );

        // Unregister
        const removed = registry.unregister("fold-toggle");
        assertEquals(removed, true);
        assertEquals(registry.has("fold-toggle"), false);
        assertEquals(registry.getAll().length, 1);
    });
});
