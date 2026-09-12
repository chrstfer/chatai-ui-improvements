/**
 * Tab State Bridge
 * Content script abstraction over WebExtension runtime messaging for per-tab activation.
 */

import type { GetTabStateRequest, GetTabStateResponse, ToggleActiveNotification } from "./messages.ts";
import { createLogger } from "../logging/index.ts";

const logger = createLogger("RPC > TabBridge");

export interface TabStateBridge {
    /**
     * Queries the background worker for the initial active state of this tab.
     * Resolves to true by default on error or non-extension environments.
     */
    getInitialState(): Promise<boolean>;

    /**
     * Subscribes to activation toggle notifications from the background toolbar action.
     * Returns an unsubscribe function.
     */
    onToggle(callback: (enabled: boolean) => void): () => void;
}

export interface RuntimeNamespaceLike {
    sendMessage?(message: unknown): Promise<unknown>;
    onMessage?: {
        addListener(
            callback: (
                message: unknown,
                sender: unknown,
                sendResponse?: (response?: unknown) => void,
            ) => Promise<unknown> | boolean | void,
        ): void;
        removeListener?(
            callback: (
                message: unknown,
                sender: unknown,
                sendResponse?: (response?: unknown) => void,
            ) => Promise<unknown> | boolean | void,
        ): void;
    };
}

export interface WebExtensionNamespaceLike {
    runtime?: RuntimeNamespaceLike;
}

declare const browser: WebExtensionNamespaceLike | undefined;
declare const chrome: WebExtensionNamespaceLike | undefined;

function getRuntimeApi(): WebExtensionNamespaceLike | undefined {
    if (typeof browser !== "undefined") return browser;
    if (typeof chrome !== "undefined") return chrome;
    if (typeof globalThis !== "undefined") {
        const g = globalThis as unknown as {
            browser?: WebExtensionNamespaceLike;
            chrome?: WebExtensionNamespaceLike;
        };
        return g.browser ?? g.chrome;
    }
    return undefined;
}

export class BrowserTabStateBridge implements TabStateBridge {
    private extensionApi: WebExtensionNamespaceLike | undefined;

    constructor(extensionApi?: WebExtensionNamespaceLike) {
        this.extensionApi = extensionApi ?? getRuntimeApi();
    }

    public async getInitialState(): Promise<boolean> {
        const runtime = this.extensionApi?.runtime;
        if (!runtime?.sendMessage) {
            logger.debug("Runtime sendMessage not available, defaulting to enabled: true");
            return true;
        }

        try {
            logger.info("Querying initial tab state from background worker...");
            const req: GetTabStateRequest = { type: "EXT_GET_TAB_STATE" };
            const resp = (await runtime.sendMessage(req)) as GetTabStateResponse | undefined;
            if (resp && typeof resp.enabled === "boolean") {
                logger.info(`Received initial tab state from background: enabled = ${resp.enabled}`);
                return resp.enabled;
            }
            logger.info("No explicit enabled field in response, defaulting to enabled: true");
            return true;
        } catch (err) {
            logger.warn("Initial state query to background failed, defaulting to enabled: true", err);
            return true;
        }
    }

    public onToggle(callback: (enabled: boolean) => void): () => void {
        const runtime = this.extensionApi?.runtime;
        if (!runtime?.onMessage) {
            logger.warn("Runtime onMessage not available, cannot subscribe to onToggle");
            return () => {};
        }

        logger.info("Subscribed to onToggle runtime messages");
        const listener = (
            message: unknown,
            _sender?: unknown,
            sendResponse?: (response?: unknown) => void,
        ): Promise<{ acknowledged: boolean }> | void => {
            logger.info("runtime.onMessage received:", message);
            const notification = message as ToggleActiveNotification | undefined;
            if (notification?.type === "EXT_TOGGLE_ACTIVE" && typeof notification.enabled === "boolean") {
                logger.info(`Dispatching EXT_TOGGLE_ACTIVE -> enabled: ${notification.enabled}`);
                callback(notification.enabled);
                sendResponse?.({ acknowledged: true });
                return Promise.resolve({ acknowledged: true });
            }
        };

        runtime.onMessage.addListener(listener);

        return () => {
            logger.info("Unsubscribed from onToggle runtime messages");
            runtime.onMessage?.removeListener?.(listener);
        };
    }
}

export const defaultTabStateBridge = new BrowserTabStateBridge();
