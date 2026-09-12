import { assertEquals } from "@std/assert";
import { BrowserTabStateBridge, type WebExtensionNamespaceLike } from "../../../src/core/rpc/index.ts";
import type {
    GetTabStateRequest,
    GetTabStateResponse,
    ToggleActiveNotification,
} from "../../../src/core/rpc/messages.ts";

Deno.test("BrowserTabStateBridge: defaults to true when extension API is unavailable", async () => {
    const bridge = new BrowserTabStateBridge(undefined);
    const initial = await bridge.getInitialState();
    assertEquals(initial, true);
});

Deno.test("BrowserTabStateBridge: queries background runtime for tab state", async () => {
    let sentMessage: unknown = null;
    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            sendMessage: (msg: unknown) => {
                sentMessage = msg;
                const resp: GetTabStateResponse = { enabled: false };
                return Promise.resolve(resp);
            },
        },
    };

    const bridge = new BrowserTabStateBridge(mockExtensionApi);
    const state = await bridge.getInitialState();
    assertEquals((sentMessage as GetTabStateRequest)?.type, "EXT_GET_TAB_STATE");
    assertEquals(state, false);
});

Deno.test("BrowserTabStateBridge: falls back to true if sendMessage rejects", async () => {
    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            sendMessage: () => Promise.reject(new Error("Channel closed")),
        },
    };

    const bridge = new BrowserTabStateBridge(mockExtensionApi);
    const state = await bridge.getInitialState();
    assertEquals(state, true);
});

Deno.test("BrowserTabStateBridge: listens to toggle notifications and unsubscribes cleanly", () => {
    let registeredListener: ((msg: unknown) => void) | null = null;
    let removedListener: ((msg: unknown) => void) | null = null;

    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            onMessage: {
                addListener: (fn) => {
                    registeredListener = fn as (msg: unknown) => void;
                },
                removeListener: (fn) => {
                    removedListener = fn as (msg: unknown) => void;
                },
            },
        },
    };

    const bridge = new BrowserTabStateBridge(mockExtensionApi);
    const toggleEvents: boolean[] = [];
    const unsub = bridge.onToggle((enabled) => {
        toggleEvents.push(enabled);
    });

    assertEquals(registeredListener !== null, true);

    // Simulate notification
    const notification: ToggleActiveNotification = {
        type: "EXT_TOGGLE_ACTIVE",
        enabled: false,
    };
    registeredListener!(notification);
    assertEquals(toggleEvents, [false]);

    // Unsubscribe
    unsub();
    assertEquals(removedListener, registeredListener);
});
