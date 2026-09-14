import { assertEquals } from "@std/assert";
import { copyTextToClipboard } from "../../../src/core/utils/clipboard.ts";

Deno.test("unit: ClipboardService: writes text directly to navigator clipboard", async () => {
    // Arrange
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

        // Act
        await copyTextToClipboard("Hello World");

        // Assert
        assertEquals(writtenText, "Hello World");
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("unit: ClipboardService: returns true when primary navigator clipboard succeeds", async () => {
    // Arrange
    const originalClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: () => Promise.resolve(),
            },
            configurable: true,
            writable: true,
        });

        // Act
        const result = await copyTextToClipboard("Test Payload");

        // Assert
        assertEquals(result, true);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("unit: ClipboardService: bypasses host fallback when primary write succeeds", async () => {
    // Arrange
    const originalClipboard = (navigator as unknown as { clipboard?: unknown }).clipboard;

    try {
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: () => Promise.resolve(),
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

        // Act
        await copyTextToClipboard("Hello World", {
            enableHostFallback: true,
            hostFallbackElement: mockHost,
        });

        // Assert
        assertEquals(fallbackTriggered, false);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("unit: ClipboardService: triggers host native copy button when primary write rejects", async () => {
    // Arrange
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

        // Act
        await copyTextToClipboard("Fallback Text", {
            enableHostFallback: true,
            hostFallbackElement: mockHost,
        });

        // Assert
        assertEquals(buttonClicked, true);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("unit: ClipboardService: returns false without triggering host button when fallback is disabled", async () => {
    // Arrange
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

        // Act
        await copyTextToClipboard("Test", {
            enableHostFallback: false,
            hostFallbackElement: mockHost,
        });

        // Assert
        assertEquals(buttonClicked, false);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});

Deno.test("unit: ClipboardService: returns false when primary rejects and native button is missing", async () => {
    // Arrange
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

        // Act
        const result = await copyTextToClipboard("Test", {
            enableHostFallback: true,
            hostFallbackElement: mockHost,
        });

        // Assert
        assertEquals(result, false);
    } finally {
        Object.defineProperty(navigator, "clipboard", {
            value: originalClipboard,
            configurable: true,
            writable: true,
        });
    }
});
