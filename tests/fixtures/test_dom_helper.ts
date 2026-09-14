import { DOMParser } from "@b-fuze/deno-dom";

/**
 * Polyfills / shims :has() selector query support onto a DOMParser Document.
 * nwsapi throws a SyntaxError when encountering :has(); this intercepts and
 * manually evaluates :has(...) pseudo-classes.
 */
export function patchHasSelector(doc: unknown): void {
    const d = doc as {
        querySelector: (sel: string) => unknown;
        querySelectorAll: (sel: string) => unknown;
    };

    const origQuerySelector = d.querySelector.bind(d);
    const origQuerySelectorAll = d.querySelectorAll.bind(d);

    function resolveHasQuery(selector: string, single: boolean): unknown {
        if (!selector.includes(":has(")) {
            return single ? origQuerySelector(selector) : origQuerySelectorAll(selector);
        }

        const parts = selector.split(/\s*,\s*/);
        const results = new Set<unknown>();

        for (const part of parts) {
            const hasMatch = part.match(/^([^:]*):has\((.+)\)$/);
            if (hasMatch) {
                const base = hasMatch[1].trim() || "*";
                const inner = hasMatch[2].trim();
                try {
                    const candidates = origQuerySelectorAll(base) as Iterable<unknown>;
                    for (const cand of candidates) {
                        const candEl = cand as { querySelector?: (s: string) => unknown };
                        if (typeof candEl.querySelector === "function") {
                            try {
                                if (candEl.querySelector(inner) !== null) {
                                    results.add(cand);
                                    if (single) return cand;
                                }
                            } catch {
                                // ignore
                            }
                        }
                    }
                } catch {
                    // ignore
                }
            } else {
                try {
                    const res = origQuerySelectorAll(part) as Iterable<unknown>;
                    for (const el of res) {
                        results.add(el);
                        if (single) return el;
                    }
                } catch {
                    // ignore
                }
            }
        }

        const arr = Array.from(results);
        return single ? (arr[0] ?? null) : arr;
    }

    d.querySelector = (sel: string) => resolveHasQuery(sel, true);
    d.querySelectorAll = (sel: string) => resolveHasQuery(sel, false);
}

export interface SetupDomOptions {
    html?: string;
    url?: string;
    sidebarWidth?: number;
}

export interface SetupDomResult {
    // deno-lint-ignore no-explicit-any
    doc: any;
    styleMap: Record<string, string>;
    cleanup: () => void;
}

/**
 * Creates a fully configured mock DOM scope for site adapter and Preact testing.
 * Automatically shims :has() queries, createElement, attachShadow, dataset, and style maps.
 */
export function setupTestDom(options: SetupDomOptions = {}): SetupDomResult {
    const html = options.html ??
        '<!DOCTYPE html><html><head></head><body><div role="main"><div class="scroller"></div></div></body></html>';
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) throw new Error("Failed to parse mock DOM HTML");

    patchHasSelector(doc);

    interface GlobalScope {
        document?: unknown;
        window?: unknown;
        Node?: unknown;
        history?: unknown;
    }
    const scope = globalThis as unknown as GlobalScope;
    const origDoc = scope.document;
    const origWindow = scope.window;
    const origNode = scope.Node;
    const origHistory = scope.history;

    const styleMap: Record<string, string> = {};
    (doc.documentElement as unknown as { style: unknown }).style = {
        setProperty: (p: string, v: string) => {
            styleMap[p] = v;
        },
        removeProperty: (p: string) => {
            delete styleMap[p];
        },
        getPropertyValue: (p: string) => styleMap[p] ?? "",
    };

    const origCreateElement = doc.createElement.bind(doc);
    const createElementShim = (tag: string) => {
        const el = origCreateElement(tag) as unknown as HTMLElement & {
            attachShadow: (init: { mode: string }) => unknown;
        };
        (el as unknown as { style: Record<string, string> }).style = {};
        el.attachShadow = () => {
            const shadow = origCreateElement("div") as unknown as ShadowRoot;
            (el as unknown as { shadowRoot: unknown }).shadowRoot = shadow;
            return shadow;
        };
        return el;
    };

    (doc as unknown as { createElement: (tag: string) => unknown }).createElement = createElementShim;
    (doc as unknown as { createElementNS: (ns: string, tag: string) => unknown }).createElementNS = (
        _ns: string,
        tag: string,
    ) => createElementShim(tag);

    doc.querySelectorAll("*").forEach((el) => {
        if (el !== doc.documentElement) {
            (el as unknown as { style: Record<string, string> }).style = {};
        }
    });

    const listeners: Record<string, (() => void)[]> = {};
    scope.document = doc;
    scope.Node = doc.body.constructor;
    scope.history = {
        pushState: () => {},
        replaceState: () => {},
    };
    scope.window = {
        location: { href: options.url ?? "https://duck.ai/" },
        innerWidth: 1200,
        innerHeight: 800,
        addEventListener: (event: string, cb: () => void) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(cb);
        },
        removeEventListener: (event: string, cb: () => void) => {
            if (listeners[event]) {
                const idx = listeners[event].indexOf(cb);
                if (idx !== -1) listeners[event].splice(idx, 1);
            }
        },
        matchMedia: () => ({
            matches: false,
            addEventListener: () => {},
            removeEventListener: () => {},
        }),
    };

    if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ext_chat_ui_settings");
    }

    return {
        doc,
        styleMap,
        cleanup: () => {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem("ext_chat_ui_settings");
            }
            scope.document = origDoc;
            scope.window = origWindow;
            scope.Node = origNode;
            scope.history = origHistory;
        },
    };
}
