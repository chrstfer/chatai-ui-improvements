import { assertEquals, assertNotEquals } from "@std/assert";
import { DOMParser, Element } from "@b-fuze/deno-dom";
import { DuckAiDomObserver } from "../../../../src/features/chats/duckai/domObserver.ts";
import type { DuckAiResponseRef } from "../../../../src/features/chats/duckai/types.ts";

const FIXTURES_DIR = new URL("./fixtures/", import.meta.url).pathname;

// Mock MutationObserver for simulated DOM events
type MutationCallback = (mutations: MutationRecord[]) => void;

class MockMutationObserver {
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

Deno.test("DuckAiDomObserver: Initial scan discovers pre-existing settled responses in fixture", async () => {
    const origMO = (globalThis as unknown as { MutationObserver?: unknown }).MutationObserver;
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = MockMutationObserver;
    MockMutationObserver.instances = [];

    try {
        const html = await Deno.readTextFile(`${FIXTURES_DIR}raw_duckai_turn.html`);
        const doc = new DOMParser().parseFromString(html, "text/html");

        const discovered: DuckAiResponseRef[] = [];
        const settled: DuckAiResponseRef[] = [];

        const observer = new DuckAiDomObserver({
            onResponseDiscovered: (ref) => discovered.push(ref),
            onResponseStreaming: () => {},
            onResponseSettled: (ref) => settled.push(ref),
        });

        observer.observe(doc.body as unknown as Node);

        // In raw_duckai_turn.html, there is 1 assistant message (excluding inner heading)
        assertEquals(discovered.length, 1);
        // The first message has data-message-actions="true" and thus is detected as settled
        assertNotEquals(settled.length, 0);
        assertEquals(observer.isSettled(settled[0].id), true);

        observer.disconnect();
    } finally {
        (globalThis as unknown as { MutationObserver?: unknown }).MutationObserver = origMO;
    }
});

Deno.test("DuckAiDomObserver: Dynamic discovery, streaming debounce, and structural settlement", async () => {
    const origMO = (globalThis as unknown as { MutationObserver?: unknown }).MutationObserver;
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = MockMutationObserver;
    MockMutationObserver.instances = [];

    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        );
        const root = doc.getElementById("chat-root") as Element;

        const discovered: DuckAiResponseRef[] = [];
        const streaming: DuckAiResponseRef[] = [];
        const settled: DuckAiResponseRef[] = [];
        const removed: string[] = [];

        const observer = new DuckAiDomObserver({
            onResponseDiscovered: (ref) => discovered.push(ref),
            onResponseStreaming: (ref) => streaming.push(ref),
            onResponseSettled: (ref) => settled.push(ref),
            onResponseRemoved: (id) => removed.push(id),
        }, {
            settlementTimeoutMs: 200,
            microDebounceMs: 50,
        });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];
        assertNotEquals(mo, undefined);

        // 1. New assistant message enters DOM without message actions (streaming)
        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-1-assistant-message-0-1");
        assistantEl.setAttribute("data-activeresponse", "true");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        assertEquals(discovered.length, 1);
        assertEquals(discovered[0].id, "turn-1-assistant-message-0-1");
        assertEquals(observer.isSettled("turn-1-assistant-message-0-1"), false);

        // 2. Micro debounce fires streaming callback
        await new Promise((resolve) => setTimeout(resolve, 80));
        assertEquals(streaming.length, 1);
        assertEquals(streaming[0].id, "turn-1-assistant-message-0-1");

        // 3. Structural settlement: message actions container added
        const actionsEl = doc.createElement("div") as Element;
        actionsEl.setAttribute("data-message-actions", "true");
        assistantEl.appendChild(actionsEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [actionsEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        assertEquals(settled.length, 1);
        assertEquals(settled[0].id, "turn-1-assistant-message-0-1");
        assertEquals(observer.isSettled("turn-1-assistant-message-0-1"), true);

        // 4. Removal of message
        assistantEl.remove();
        mo.trigger([{
            type: "childList",
            addedNodes: [] as unknown as NodeList,
            removedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
        }]);

        assertEquals(removed.length, 1);
        assertEquals(removed[0], "turn-1-assistant-message-0-1");
        assertEquals(observer.isSettled("turn-1-assistant-message-0-1"), false);

        observer.disconnect();
    } finally {
        (globalThis as unknown as { MutationObserver?: unknown }).MutationObserver = origMO;
    }
});

Deno.test("DuckAiDomObserver: Macro silence fallback settles stream after inactivity timeout", async () => {
    const origMO = (globalThis as unknown as { MutationObserver?: unknown }).MutationObserver;
    (globalThis as unknown as { MutationObserver: unknown }).MutationObserver = MockMutationObserver;
    MockMutationObserver.instances = [];

    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        );
        const root = doc.getElementById("chat-root") as Element;

        const settled: DuckAiResponseRef[] = [];

        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: () => {},
            onResponseSettled: (ref) => settled.push(ref),
        }, {
            settlementTimeoutMs: 150,
            microDebounceMs: 40,
        });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

        // Assistant message without data-message-actions
        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-2-assistant-message-0-1");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        assertEquals(settled.length, 0);

        // Wait microDebounce (40ms) + settlementTimeout (150ms) + buffer
        await new Promise((resolve) => setTimeout(resolve, 250));

        assertEquals(settled.length, 1);
        assertEquals(settled[0].id, "turn-2-assistant-message-0-1");
        assertEquals(observer.isSettled("turn-2-assistant-message-0-1"), true);

        observer.disconnect();
    } finally {
        (globalThis as unknown as { MutationObserver?: unknown }).MutationObserver = origMO;
    }
});
