/**
 * Typed RPC Message Contracts for WebExtension Cross-Context Communication
 * Used between background service worker and content script.
 */

export interface GetTabStateRequest {
    type: "EXT_GET_TAB_STATE";
}

export interface GetTabStateResponse {
    enabled: boolean;
}

export interface ToggleActiveNotification {
    type: "EXT_TOGGLE_ACTIVE";
    enabled: boolean;
}

export type ExtensionMessage =
    | GetTabStateRequest
    | ToggleActiveNotification;
