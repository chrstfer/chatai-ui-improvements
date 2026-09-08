import { assertEquals } from "@std/assert";
import { copyTextToClipboard } from "../src/core/utils/clipboard.ts";

Deno.test("copyTextToClipboard: Primary path succeeds via navigator.clipboard.writeText", async () => {
    let writtenText = "";
    const originalClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: (text: string) => {
                    writtenText = text;
                    return Promise.resolve();
                },
            },
            configurable: true,
            writable: true,
        });

        let fallbackTriggered = false;
        const mockHost = {
            querySelector: () => {
                fallbackTriggered = true;
                return null;
            },
        } as unknown as HTMLElement;

        const result = await copyTextToClipboard("Hello World", {
            enableHostFallback: true,
            hostFallbackElement: mockHost,
        });

        assertEquals(result, true);
        assertEquals(writtenText, "Hello World");
        assertEquals(fallbackTriggered, false);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("copyTextToClipboard: Falls back to host native copy button when primary rejects", async () => {
    const originalClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: () => Promise.reject(new Error("Permission denied")),
            },
            configurable: true,
            writable: true,
        });

        let buttonClicked = false;
        const mockButton = {
            click: () => {
                buttonClicked = true;
            },
        };

        const mockHost = {
            querySelector: (selector: string) => {
                if (selector.includes("copy-button")) {
                    return mockButton;
                }
                return null;
            },
        } as unknown as HTMLElement;

        const result = await copyTextToClipboard("Fallback Text", {
            enableHostFallback: true,
            hostFallbackElement: mockHost,
        });

        assertEquals(result, true);
        assertEquals(buttonClicked, true);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("copyTextToClipboard: Does not trigger fallback when enableHostFallback is false", async () => {
    const originalClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: () => Promise.reject(new Error("NotAllowedError")),
            },
            configurable: true,
            writable: true,
        });

        let buttonClicked = false;
        const mockHost = {
            querySelector: () => {
                buttonClicked = true;
                return { click: () => {} };
            },
        } as unknown as HTMLElement;

        const result = await copyTextToClipboard("Test", {
            enableHostFallback: false,
            hostFallbackElement: mockHost,
        });

        assertEquals(result, false);
        assertEquals(buttonClicked, false);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("copyTextToClipboard: Returns false when primary rejects and native copy button not found", async () => {
    const originalClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: () => Promise.reject(new Error("DOMException")),
            },
            configurable: true,
            writable: true,
        });

        const mockHost = {
            querySelector: () => null,
        } as unknown as HTMLElement;

        const result = await copyTextToClipboard("Test", {
            enableHostFallback: true,
            hostFallbackElement: mockHost,
        });

        assertEquals(result, false);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});
