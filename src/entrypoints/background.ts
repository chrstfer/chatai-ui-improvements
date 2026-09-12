import type { GetTabStateRequest, GetTabStateResponse, ToggleActiveNotification } from "../core/rpc/messages.ts";
import { createLogger } from "../core/logging/index.ts";

export interface WebExtensionTab {
    id?: number;
    url?: string;
    [key: string]: unknown;
}

export interface WebExtensionActionArea {
    onClicked: {
        addListener(callback: (tab: WebExtensionTab) => void | Promise<void>): void;
    };
    setBadgeText(details: { tabId?: number; text: string }): Promise<void>;
    setBadgeBackgroundColor(details: { tabId?: number; color: string }): Promise<void>;
}

export interface WebExtensionNamespace {
    action?: WebExtensionActionArea;
    browserAction?: WebExtensionActionArea;
    tabs?: {
        sendMessage(tabId: number, message: unknown): Promise<unknown>;
        query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<WebExtensionTab[]>;
        onUpdated: {
            addListener(
                callback: (
                    tabId: number,
                    changeInfo: { status?: string },
                    tab: WebExtensionTab,
                ) => void | Promise<void>,
            ): void;
        };
        onRemoved: {
            addListener(callback: (tabId: number) => void | Promise<void>): void;
        };
    };
    runtime?: {
        onMessage: {
            addListener(
                callback: (
                    message: unknown,
                    sender: { tab?: WebExtensionTab },
                    sendResponse?: (response?: unknown) => void,
                ) => Promise<unknown> | boolean | void,
            ): void;
        };
    };
}

declare const browser: WebExtensionNamespace | undefined;

const logger = createLogger("Background");
logger.info("Background script loaded and initializing");

function getActionApi(): WebExtensionActionArea | undefined {
    if (typeof browser === "undefined") return undefined;
    return browser.action ?? browser.browserAction;
}

// In-memory per-tab activation state: tabId -> enabled boolean (default: true)
export const tabStates = new Map<number, boolean>();

export async function setTabActive(tabId: number, enabled: boolean): Promise<void> {
    tabStates.set(tabId, enabled);
    logger.info(`setTabActive: tabId ${tabId} -> enabled: ${enabled}`);
    const action = getActionApi();
    if (action) {
        try {
            if (!enabled) {
                await action.setBadgeText({ tabId, text: "OFF" });
                await action.setBadgeBackgroundColor({ tabId, color: "#666666" });
                logger.debug(`Set 'OFF' badge for tab ${tabId}`);
            } else {
                await action.setBadgeText({ tabId, text: "" });
                logger.debug(`Cleared badge for tab ${tabId}`);
            }
        } catch (e) {
            logger.warn(`Failed to set badge for tab ${tabId}`, e);
        }
    }
}

export function isTabActive(tabId: number): boolean {
    return tabStates.get(tabId) ?? true;
}

// 1. Toolbar action click listener
const actionApi = getActionApi();
if (actionApi?.onClicked) {
    logger.info("Registered toolbar action click listener");
    actionApi.onClicked.addListener(async (tab: WebExtensionTab): Promise<void> => {
        logger.info(`Toolbar action clicked: raw tab.id = ${tab?.id}, url = ${tab?.url}`);
        let tabId = tab?.id;
        if (typeof tabId !== "number" && typeof browser !== "undefined" && browser?.tabs?.query) {
            try {
                const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                tabId = tabs?.[0]?.id;
                logger.info(`Resolved tabId via tabs.query: ${tabId}`);
            } catch (err) {
                logger.warn("Failed to query active tab", err);
            }
        }
        if (typeof tabId !== "number") {
            logger.warn("Could not determine tab ID, aborting toggle");
            return;
        }

        const current = isTabActive(tabId);
        const next = !current;
        logger.info(`Toggling tab ${tabId}: current = ${current} -> next = ${next}`);
        await setTabActive(tabId, next);

        if (typeof browser !== "undefined" && browser?.tabs?.sendMessage) {
            try {
                const notification: ToggleActiveNotification = {
                    type: "EXT_TOGGLE_ACTIVE",
                    enabled: next,
                };
                logger.info(`Sending EXT_TOGGLE_ACTIVE to tab ${tabId}, payload:`, notification);
                const response = await browser.tabs.sendMessage(tabId, notification);
                logger.info(`Content script acknowledged EXT_TOGGLE_ACTIVE on tab ${tabId}, response:`, response);
            } catch (err) {
                logger.error(`Failed to send EXT_TOGGLE_ACTIVE to tab ${tabId}:`, err);
            }
        } else {
            logger.warn("browser.tabs.sendMessage is not available");
        }
    });
} else {
    logger.warn("actionApi.onClicked is not available");
}

// 2. Tab reload / navigation listener to preserve badge state across reloads
if (typeof browser !== "undefined" && browser?.tabs?.onUpdated) {
    browser.tabs.onUpdated.addListener(async (tabId: number, changeInfo: { status?: string }): Promise<void> => {
        if (changeInfo.status === "loading") {
            const enabled = isTabActive(tabId);
            logger.debug(`Tab ${tabId} loading, preserving state (enabled: ${enabled})`);
            if (!enabled) {
                await setTabActive(tabId, false);
            }
        }
    });
}

// 3. Tab removal cleanup
if (typeof browser !== "undefined" && browser?.tabs?.onRemoved) {
    browser.tabs.onRemoved.addListener((tabId: number) => {
        logger.debug(`Tab ${tabId} removed, clearing memory state`);
        tabStates.delete(tabId);
    });
}

// 4. Runtime message listener for content script querying initial state (returns Promise)
if (typeof browser !== "undefined" && browser?.runtime?.onMessage) {
    browser.runtime.onMessage.addListener(
        (message: unknown, sender: { tab?: WebExtensionTab }): Promise<GetTabStateResponse> | void => {
            const req = message as GetTabStateRequest | undefined;
            if (req?.type === "EXT_GET_TAB_STATE") {
                const tabId = sender.tab?.id;
                const enabled = typeof tabId === "number" ? isTabActive(tabId) : true;
                logger.info(`Content script queried initial state for tab ${tabId}, responding enabled: ${enabled}`);
                return Promise.resolve({ enabled });
            }
        },
    );
}
