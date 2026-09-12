export type {
    ExtensionMessage,
    GetTabStateRequest,
    GetTabStateResponse,
    ToggleActiveNotification,
} from "./messages.ts";

export {
    BrowserTabStateBridge,
    defaultTabStateBridge,
    type RuntimeNamespaceLike,
    type TabStateBridge,
    type WebExtensionNamespaceLike,
} from "./tabBridge.ts";
