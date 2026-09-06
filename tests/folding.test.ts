import { assertEquals } from "jsr:@std/assert";
import {
    nextGlobalFoldState,
    nextLocalFoldState,
    nextRenderMode,
    OutlineFoldState,
    RenderMode,
} from "../src/ui/folding.ts";

Deno.test("UI Outline Folding & Render Mode State Model", async (t) => {
    await t.step("nextLocalFoldState for leaf nodes cycles folded <-> subtree", () => {
        let state: OutlineFoldState = "folded";
        state = nextLocalFoldState(state, false);
        assertEquals(state, "subtree");

        state = nextLocalFoldState(state, false);
        assertEquals(state, "folded");

        state = nextLocalFoldState(state, false);
        assertEquals(state, "subtree");
    });

    await t.step("nextLocalFoldState for branch nodes cycles folded -> children -> subtree -> folded", () => {
        let state: OutlineFoldState = "folded";
        state = nextLocalFoldState(state, true);
        assertEquals(state, "children");

        state = nextLocalFoldState(state, true);
        assertEquals(state, "subtree");

        state = nextLocalFoldState(state, true);
        assertEquals(state, "folded");

        state = nextLocalFoldState(state, true);
        assertEquals(state, "children");
    });

    await t.step("nextGlobalFoldState cycles folded -> children -> subtree -> folded", () => {
        let state: OutlineFoldState = "folded";
        state = nextGlobalFoldState(state);
        assertEquals(state, "children");

        state = nextGlobalFoldState(state);
        assertEquals(state, "subtree");

        state = nextGlobalFoldState(state);
        assertEquals(state, "folded");
    });

    await t.step("nextRenderMode cycles rendered <-> raw", () => {
        let mode: RenderMode = "rendered";
        mode = nextRenderMode(mode);
        assertEquals(mode, "raw");

        mode = nextRenderMode(mode);
        assertEquals(mode, "rendered");
    });
});
