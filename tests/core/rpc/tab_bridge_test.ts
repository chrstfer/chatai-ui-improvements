import { assertEquals } from "@std/assert";
import { BrowserTabStateBridge, type WebExtensionNamespaceLike } from "@internal/core/rpc";
import type { GetTabStateRequest, GetTabStateResponse, ToggleActiveNotification } from "@internal/core/rpc";

Deno.test("unit: BrowserTabStateBridge: defaults to true when extension API is unavailable", async () => {
    // Arrange
    const bridge = new BrowserTabStateBridge(undefined);

    // Act
    const initial = await bridge.getInitialState();

    // Assert
    assertEquals(initial, true);
});

Deno.test("unit: BrowserTabStateBridge: sends EXT_GET_TAB_STATE message to runtime", async () => {
    // Arrange
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

    // Act
    await bridge.getInitialState();

    // Assert
    assertEquals((sentMessage as GetTabStateRequest)?.type, "EXT_GET_TAB_STATE");
});

Deno.test("unit: BrowserTabStateBridge: resolves tab state response boolean from runtime", async () => {
    // Arrange
    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            sendMessage: () => {
                const resp: GetTabStateResponse = { enabled: false };
                return Promise.resolve(resp);
            },
        },
    };
    const bridge = new BrowserTabStateBridge(mockExtensionApi);

    // Act
    const state = await bridge.getInitialState();

    // Assert
    assertEquals(state, false);
});

Deno.test("unit: BrowserTabStateBridge: falls back to true when sendMessage rejects", async () => {
    // Arrange
    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            sendMessage: () => Promise.reject(new Error("Channel closed")),
        },
    };
    const bridge = new BrowserTabStateBridge(mockExtensionApi);

    // Act
    const state = await bridge.getInitialState();

    // Assert
    assertEquals(state, true);
});

Deno.test("unit: BrowserTabStateBridge: registers runtime message listener on onToggle subscription", () => {
    // Arrange
    let registeredListener: ((msg: unknown) => void) | null = null;
    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            onMessage: {
                addListener: (fn) => {
                    registeredListener = fn as (msg: unknown) => void;
                },
                removeListener: () => {},
            },
        },
    };
    const bridge = new BrowserTabStateBridge(mockExtensionApi);

    // Act
    bridge.onToggle(() => {});

    // Assert
    assertEquals(registeredListener !== null, true);
});

Deno.test("unit: BrowserTabStateBridge: dispatches toggle callback on EXT_TOGGLE_ACTIVE notification", () => {
    // Arrange
    let registeredListener: ((msg: unknown) => void) | null = null;
    const mockExtensionApi: WebExtensionNamespaceLike = {
        runtime: {
            onMessage: {
                addListener: (fn) => {
                    registeredListener = fn as (msg: unknown) => void;
                },
                removeListener: () => {},
            },
        },
    };
    const bridge = new BrowserTabStateBridge(mockExtensionApi);
    const toggleEvents: boolean[] = [];
    bridge.onToggle((enabled) => {
        toggleEvents.push(enabled);
    });

    // Act
    const notification: ToggleActiveNotification = {
        type: "EXT_TOGGLE_ACTIVE",
        enabled: false,
    };
    registeredListener!(notification);

    // Assert
    assertEquals(toggleEvents, [false]);
});

Deno.test("unit: BrowserTabStateBridge: unregisters message listener upon unsubscribe", () => {
    // Arrange
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
    const unsub = bridge.onToggle(() => {});

    // Act
    unsub();

    // Assert
    assertEquals(removedListener, registeredListener);
});
