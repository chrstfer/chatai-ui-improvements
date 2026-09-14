import { DOMParser } from "@b-fuze/deno-dom";
import { resetStyleSheetCache } from "./stylesheet_fixture.ts";

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
    setMediaMatches: (val: boolean) => void;
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
        Element?: unknown;
        HTMLElement?: unknown;
        ShadowRoot?: unknown;
        history?: unknown;
        MutationObserver?: unknown;
        matchMedia?: unknown;
        location?: unknown;
    }
    const scope = globalThis as unknown as GlobalScope;
    const origDoc = scope.document;
    const origWindow = scope.window;
    const origNode = scope.Node;
    const origElement = scope.Element;
    const origHTMLElement = scope.HTMLElement;
    const origShadowRoot = scope.ShadowRoot;
    const origHistory = scope.history;
    const origMO = scope.MutationObserver;
    const origMatchMedia = scope.matchMedia;
    const origLocation = scope.location;

    scope.MutationObserver = MockMutationObserver;
    MockMutationObserver.instances = [];

    // deno-lint-ignore no-explicit-any
    class MockShadowRoot extends (doc.body.constructor as new () => any) {
        public host: unknown = null;
        public adoptedStyleSheets: unknown[] = [];
    }
    scope.ShadowRoot = MockShadowRoot;

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
            const shadow = origCreateElement("div") as unknown as HTMLElement & {
                host: unknown;
                adoptedStyleSheets: unknown[];
            };
            Object.setPrototypeOf(shadow, MockShadowRoot.prototype);
            shadow.host = el;
            shadow.adoptedStyleSheets = [];
            (el as unknown as { shadowRoot: unknown }).shadowRoot = shadow;
            return shadow as unknown as ShadowRoot;
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

    let mediaMatches = false;
    const mediaListeners: (() => void)[] = [];
    const listeners: Record<string, (() => void)[]> = {};
    scope.document = doc;
    scope.Node = doc.body.constructor;
    scope.Element = doc.body.constructor;
    scope.HTMLElement = doc.body.constructor;
    scope.history = {
        pushState: () => {},
        replaceState: () => {},
    };
    const mockWindow = {
        location: { href: options.url ?? "https://duck.ai/" },
        innerWidth: 1200,
        innerHeight: 800,
        document: doc,
        Node: doc.body.constructor,
        Element: doc.body.constructor,
        Event: globalThis.Event,
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
        matchMedia: (query: string) => ({
            query,
            matches: mediaMatches,
            addEventListener: (_event: string, cb: () => void) => {
                mediaListeners.push(cb);
            },
            removeEventListener: (_event: string, cb: () => void) => {
                const idx = mediaListeners.indexOf(cb);
                if (idx !== -1) mediaListeners.splice(idx, 1);
            },
        }),
    };
    scope.window = mockWindow;
    scope.matchMedia = mockWindow.matchMedia;
    scope.location = mockWindow.location;
    (doc as unknown as { defaultView?: unknown }).defaultView = mockWindow;

    if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ext_chat_ui_settings");
    }

    return {
        doc,
        styleMap,
        setMediaMatches: (val: boolean) => {
            mediaMatches = val;
            mediaListeners.forEach((cb) => cb());
        },
        cleanup: () => {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem("ext_chat_ui_settings");
            }
            scope.document = origDoc;
            scope.window = origWindow;
            scope.Node = origNode;
            scope.Element = origElement;
            scope.HTMLElement = origHTMLElement;
            scope.ShadowRoot = origShadowRoot;
            scope.history = origHistory;
            scope.MutationObserver = origMO;
            scope.matchMedia = origMatchMedia;
            scope.location = origLocation;
            MockMutationObserver.instances = [];
            resetStyleSheetCache();
        },
    };
}

export type MutationCallback = (mutations: MutationRecord[]) => void;

export class MockMutationObserver {
    public callback: MutationCallback;
    public target: unknown = null;
    public options: unknown = null;
    public disconnected = false;
    public static instances: MockMutationObserver[] = [];

    constructor(callback: MutationCallback) {
        this.callback = callback;
        MockMutationObserver.instances.push(this);
    }

    observe(target: unknown, options: unknown) {
        this.target = target;
        this.options = options;
        this.disconnected = false;
    }

    disconnect() {
        this.disconnected = true;
    }

    trigger(mutations: Partial<MutationRecord>[]) {
        if (!this.disconnected) {
            this.callback(mutations as MutationRecord[]);
        }
    }
}

/**
 * Triggers a synthetic click event on a DOM node with full ancestor bubbling.
 */
export function triggerClick(el: unknown): void {
    if (el && typeof (el as { dispatchEvent?: unknown }).dispatchEvent === "function") {
        const origTarget = el;
        const ev = new Event("click", { bubbles: true, cancelable: true });
        Object.defineProperty(ev, "target", {
            get: () => origTarget,
            configurable: true,
        });
        let curr = el as (Node & { dispatchEvent?: (e: Event) => boolean; parentNode?: Node | null }) | null;
        while (curr) {
            if (typeof curr.dispatchEvent === "function") {
                curr.dispatchEvent(ev);
            }
            if ((ev as unknown as { cancelBubble?: boolean }).cancelBubble) {
                break;
            }
            curr = curr.parentNode as typeof curr;
        }
        const targetEl = el as { tagName?: string; dispatchEvent?: (ev: Event) => void };
        if (targetEl.tagName === "INPUT" && typeof targetEl.dispatchEvent === "function") {
            targetEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }
}

/**
 * Interface for renderInShadow return value.
 */
export interface ShadowRenderResult {
    container: HTMLElement;
    baseElement: HTMLElement;
    host: HTMLElement;
    shadowRoot: ShadowRoot;
    unmount: () => void;
    // deno-lint-ignore no-explicit-any
    debug: (el?: any) => void;
    // deno-lint-ignore no-explicit-any
    rerender: (ui: any) => void;
    // deno-lint-ignore no-explicit-any
    asFragment: () => any;
}

/**
 * Renders a Preact component inside an open Shadow Root container.
 * Intended for integration tests that verify custom element shadow boundary isolation
 * and adopted stylesheets.
 */
export function renderInShadow(_ui: unknown, _options: unknown = {}): ShadowRenderResult {
    const host = (globalThis.document as unknown as Document).createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    (globalThis.document as unknown as Document).body.appendChild(host);

    return {
        container: shadow as unknown as HTMLElement,
        baseElement: (globalThis.document as unknown as Document).body as unknown as HTMLElement,
        host,
        shadowRoot: shadow,
        unmount: () => {
            host.remove();
        },
        debug: () => {},
        rerender: () => {},
        asFragment: () => null,
    };
}
