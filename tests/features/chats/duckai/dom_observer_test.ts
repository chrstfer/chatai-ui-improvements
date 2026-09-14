import { assertEquals } from "@std/assert";
import { DOMParser, Element } from "@b-fuze/deno-dom";
import { DuckAiDomObserver } from "../../../../src/features/chats/duckai/domObserver.ts";
import type { DuckAiResponseRef } from "../../../../src/features/chats/duckai/types.ts";
import { loadHtmlFixture } from "../../../fixtures/fixture_loader.ts";
import { MockMutationObserver, setupTestDom } from "../../../fixtures/dom_fixture.ts";

Deno.test("integration: DuckAiDomObserver: initial scan discovers pre-existing settled responses in fixture", () => {
    const { cleanup } = setupTestDom();
    try {
        const html = loadHtmlFixture("duckai", "raw_duckai_turn.html");
        const doc = new DOMParser().parseFromString(html, "text/html")!;
        const discovered: DuckAiResponseRef[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: (ref) => discovered.push(ref),
            onResponseStreaming: () => {},
            onResponseSettled: () => {},
        });
        observer.observe(doc.body as unknown as Node);
        assertEquals(discovered.length, 1);
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: initial scan marks response with message actions as settled", () => {
    const { cleanup } = setupTestDom();
    try {
        const html = loadHtmlFixture("duckai", "raw_duckai_turn.html");
        const doc = new DOMParser().parseFromString(html, "text/html")!;
        const settled: DuckAiResponseRef[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: () => {},
            onResponseSettled: (ref) => settled.push(ref),
        });
        observer.observe(doc.body as unknown as Node);
        assertEquals(observer.isSettled(settled[0]?.id), true);
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: dynamic discovery detects streaming response entering DOM", () => {
    const { cleanup } = setupTestDom();
    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        )!;
        const root = doc.getElementById("chat-root") as Element;
        const discovered: DuckAiResponseRef[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: (ref) => discovered.push(ref),
            onResponseStreaming: () => {},
            onResponseSettled: () => {},
        }, { settlementTimeoutMs: 200, microDebounceMs: 50 });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

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
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: streaming response is marked unsettled before debounce", () => {
    const { cleanup } = setupTestDom();
    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        )!;
        const root = doc.getElementById("chat-root") as Element;
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: () => {},
            onResponseSettled: () => {},
        }, { settlementTimeoutMs: 200, microDebounceMs: 50 });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-1-assistant-message-0-1");
        assistantEl.setAttribute("data-activeresponse", "true");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        assertEquals(observer.isSettled("turn-1-assistant-message-0-1"), false);
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: micro debounce fires streaming callback", async () => {
    const { cleanup } = setupTestDom();
    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        )!;
        const root = doc.getElementById("chat-root") as Element;
        const streaming: DuckAiResponseRef[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: (ref) => streaming.push(ref),
            onResponseSettled: () => {},
        }, { settlementTimeoutMs: 200, microDebounceMs: 50 });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-1-assistant-message-0-1");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        await new Promise((resolve) => setTimeout(resolve, 80));
        assertEquals(streaming.length, 1);
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: message actions addition marks response settled", () => {
    const { cleanup } = setupTestDom();
    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        )!;
        const root = doc.getElementById("chat-root") as Element;
        const settled: DuckAiResponseRef[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: () => {},
            onResponseSettled: (ref) => settled.push(ref),
        }, { settlementTimeoutMs: 200, microDebounceMs: 50 });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-1-assistant-message-0-1");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        const actionsEl = doc.createElement("div") as Element;
        actionsEl.setAttribute("data-message-actions", "true");
        assistantEl.appendChild(actionsEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [actionsEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        assertEquals(observer.isSettled("turn-1-assistant-message-0-1"), true);
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: response removal triggers onResponseRemoved callback", () => {
    const { cleanup } = setupTestDom();
    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        )!;
        const root = doc.getElementById("chat-root") as Element;
        const removed: string[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: () => {},
            onResponseSettled: () => {},
            onResponseRemoved: (id) => removed.push(id),
        });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-1-assistant-message-0-1");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        assistantEl.remove();
        mo.trigger([{
            type: "childList",
            addedNodes: [] as unknown as NodeList,
            removedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
        }]);

        assertEquals(removed, ["turn-1-assistant-message-0-1"]);
        observer.disconnect();
    } finally {
        cleanup();
    }
});

Deno.test("integration: DuckAiDomObserver: macro silence fallback settles stream after inactivity timeout", async () => {
    const { cleanup } = setupTestDom();
    try {
        const doc = new DOMParser().parseFromString(
            "<html><body><div id='chat-root'></div></body></html>",
            "text/html",
        )!;
        const root = doc.getElementById("chat-root") as Element;
        const settled: DuckAiResponseRef[] = [];
        const observer = new DuckAiDomObserver({
            onResponseDiscovered: () => {},
            onResponseStreaming: () => {},
            onResponseSettled: (ref) => settled.push(ref),
        }, { settlementTimeoutMs: 150, microDebounceMs: 40 });

        observer.observe(root as unknown as Node);
        const mo = MockMutationObserver.instances[0];

        const assistantEl = doc.createElement("div") as Element;
        assistantEl.setAttribute("id", "turn-2-assistant-message-0-1");
        root.appendChild(assistantEl);

        mo.trigger([{
            type: "childList",
            addedNodes: [assistantEl as unknown as Node] as unknown as NodeList,
            removedNodes: [] as unknown as NodeList,
        }]);

        await new Promise((resolve) => setTimeout(resolve, 250));
        assertEquals(observer.isSettled("turn-2-assistant-message-0-1"), true);
        observer.disconnect();
    } finally {
        cleanup();
    }
});
